const uuid = require('uuid-v4');
const amqp = require('amqplib');
const { mq } = require('./config');
const mqConn = amqp.connect(mq.url);
const mqChannel = mqConn.then(conn => conn.createChannel());
const callerId = require('caller-id');
const S = require('string');
const os = require('os');

let queues = {};

function recordCallback(queueName, eventType, cb) {
  if (!queues[queueName]) queues[queueName] = {};

  queues[queueName][eventType] = cb;
}

module.exports = {
  on: (eventType, cb) => {
    const queueName = `notifications-${os.userInfo().username}.${S(S(callerId.getData().filePath).splitRight('/', 1)[1]).strip(".js")}`;

    let channel;

    return mqChannel.then(_channel => {
      channel = _channel;
      return channel.assertQueue(queueName, { durable: true, exclusive: false });
    }).then(() => {
      return channel.bindQueue(queueName, mq.exchange, eventType);
    }).then(() => {
      return recordCallback(queueName, eventType, cb);
    }).then(() => {
      channel.consume(queueName, msg => {
        const obj = JSON.parse(msg.content.toString());
        const cb = queues[queueName][obj.eventType];
        console.log(cb.toString());

        if (cb) cb(obj);

        channel.ack(msg);
      });
    });
  }
}

