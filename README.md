# <img src="https://github.com/ypear/events/blob/main/Yjs.png" height="32" style="vertical-align:40px;"/>🍐# @ypear/events 📥

### 💾 Installation

```sh
npm install @ypear/events
```

### 👀 Description

User events that work even if the user is offline.

### 🤯 Gotchas

- Events are strings

- When sent to the client if they have not seen an event, it will be prefixed with a `*` so that you can play a sound

- When sent to the client the event will have a `|unixDate` in UTC appended at the end which was when the event was recorded

### ✅ Usage

```js
(async () => {

  const router1 = await require('@ypear/router.js')({}, {
    networkName: 'very-unique-4898n0aev7e7egigtr',
    seed: 'a788bbf9fe2a420ad2703cabc9efc9e1',
    username: 'benz'
  });

  const onEvent1 = await require('@ypear/events.js')(router1, {
    topic: 'testing',
    forWho: async (ev) => {
      const owner = 'benz';
      return owner;
    },
    display: async (evArray) => { // send it to clientside
      return new Promise(async (resolve) => {
        setTimeout(() => {
          console.log('benz', { evArray });
          resolve();
        }, 1000);
      });
    }
  });

  await onEvent1('test|1234|something happend');

  const router2 = await require('@ypear/router.js')({}, {
    networkName: 'very-unique-4898n0aev7e7egigtr',
    seed: 'a788bbf9fe2a420ad270fcabc9efc9e1',
    username: 'daniel'
  });

  const onEvent2 = await require('@ypear/events.js')(router2, {
    topic: 'testing',
    forWho: async (ev) => {
      const owner = 'benz';
      return owner;
    },
    display: async (evArray) => { // send it to clientside
      return new Promise(async (resolve) => {
        setTimeout(() => {
          console.log('daniel', { evArray });
          resolve();
        }, 1000);
      });
    }
  });

  await onEvent2('test|5678|something happend');

})();
```

### 📜 License

MIT
