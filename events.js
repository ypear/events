const ypearEvents = module.exports = async (router, options) => {
  return new Promise(async (resolve) => {
    // will take events for addresses or usernames
    // will use crdt replication
    // wont need to know if users are online
    // processes things for other users
    if (typeof options.topic !== 'string') throw '1';
    if (typeof options.forWho !== 'function') throw '2';
    if (typeof options.display !== 'function') throw '3';

    const publicKey = router.publicKey;

    const ypearCRDT = require('../crdt/crdt.js');
    const crdt = await ypearCRDT(router, {
      topic: `${options.topic}-db`,
      leveldb: `./${options.topic}-db`
    });

    const Y = router.options.Y;
    const username = router.options.username;

    // Wait for CRDT to be synced as well
    await new Promise((resolve) => {
      const checkCRDTSync = () => {
        if (router.options.cache[`${options.topic}-db`]?.synced) {
          console.log(`${router.options.username} CRDT is synced!`);
          resolve();
        } else {
          setTimeout(checkCRDTSync, 100);
        }
      };
      checkCRDTSync();
    });

    let draining = false;
    let drain = [];

    async function onEvent(evs) {
      // 'evType|convay|info|here|85836262376484'
      const owner = Array.isArray(evs) ? router.options.username : await options.forWho(evs);
      if (router.options.username == owner) { // nom nom nom ...
        if (!Array.isArray(evs)) evs = [evs];
        const keep = [];
        for await (const ev of evs) {
          if (crdt.c[owner][ev] && crdt.c[owner][ev].setBy !== username) keep.push(ev);
          else if (!crdt.c[owner][ev]) {
            await crdt.set(username, ev, {
              setBy: username,
              date: +new Date(),
              seen: false
            });
            keep.push(ev);
          }
        }
        evs = [...keep];
        if (draining) drain.push(...evs);
        else {
          draining = true;
          const prep = [];
          for (let ev of evs) {
            prep.push((crdt.c[username][ev].seen ? '' : '*') + ev + '|' + crdt.c[username][ev].date);
          }
          await options.display(prep); // show the client [ev ...]
          for await (let ev of evs) {
            if (!crdt.c[username][ev].seen) {
              await crdt.set(username, ev, {
                setBy: username,
                date: crdt.c[username][ev].date,
                seen: true
              });
            }
          }
          if (drain.length) {
            evs = [...drain];
            drain.length = 0;
            await onEvent(evs);
          }
          else if (Object.keys(crdt.c[username]).length) { // the length of your personal event array
            for (const ev of Object.keys(crdt.c[username])) {
              if (crdt.c[username][ev].seen && crdt.c[username][ev].date < (+new Date() - 86400000 * 7)) { // seen and over 7 days old
                await crdt.del(username, ev);
              }
            }
          }
          draining = false;
        }
      }
      else { // for someone else
        const ev = evs;
        await crdt.set(owner, ev, {
          setBy: username,
          date: +new Date(),
          seen: false
        });
      }
    }

    if (!router.started) await router.start(router.options.networkName);

    if (!crdt.c[username]) await crdt.map(username);

    if (crdt.c[username]) {
      crdt.observe(username, async (event, transaction) => {
        const notByMe = [];
        const changedKeys = Array.from(event.keysChanged);
        changedKeys.forEach(key => {
          const val = event.target.get(key);
          if (val.setBy !== username) notByMe.push(key);
          
        });
        if (notByMe.length) {
          if (!draining) await onEvent(notByMe);
          else drain.push(...notByMe);
        }
      });
      drain = Object.keys(crdt.c[username]);
    }

    setTimeout(async () => {
      if (drain.length) {
        const evs = [...drain];
        drain.length = 0;
        await onEvent(evs);
      }
    }, 0);

    resolve(onEvent);
  });
}
