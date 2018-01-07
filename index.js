const { app, Menu, Tray } = require('electron');
const notifier = require('node-notifier');
const mq = require('./mq');
const config = require('./config');
const yaml = require('js-yaml');
const fs = require('fs');

const renderNotification = (message) => ({
  title: 'Message',
  message,
  sound: config.sound,
});

process.stdin.resume();
process.on ('exit', code => {

  console.log(yaml.safeDump(config));
  fs.writeFile('config.yaml', yaml.safeDump(config), (e) => console.log(e));

  process.exit (code);
});

app.on('ready', () => {
  config.mq.binds.forEach((bind) => {
    mq.on(bind.routingKey, (event) => bind.state ? notifier.notify(renderNotification(JSON.stringify(event))) : null);
  });

  const tray = new Tray('./logo.png');

  const menu = Menu.buildFromTemplate([
    {
      label: 'Settings',
      submenu: config.mq.binds.map((bind) => {
        return {
          label: bind.label,
          type: 'checkbox',
          checked: bind.state,
          click: ({ checked }) => bind.state = checked,
        }
      }),
    },
    {
      label: 'Exit',
      role: 'quit',
    },
  ]);

  tray.setToolTip('FUn Notifications');
  tray.setContextMenu(menu);
});
