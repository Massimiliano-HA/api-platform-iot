const mqtt = require('mqtt');

const brokerUrl = 'mqtt://mqtt-dashboard.com';
const tcpPort = 1883;
const wsPort = 8083;
const securePort = 8883;
const secureWsPort = 8084;

const clientName = 'mqtt-node-client';

const options = {
    clientId: clientName
};

const client = mqtt.connect(brokerUrl, options);

client.on('connect', () => {
    console.log('Connecté au serveur MQTT');

    // Abonnez-vous à un sujet (topic)
    client.subscribe('example-topic', (err) => {
        if (!err) {
            console.log('Abonné au sujet (topic) "example-topic"');
        }
        setInterval(() => {
            client.publish('example-topic', 'Hello MQTT!');
        }, 5000);

    });

    // Envoi d'un message après la connexion
});

client.on('message', (topic, message) => {
    console.log(`Message reçu du sujet (topic) "${topic}": ${message.toString()}`);
});

client.on('close', () => {
    console.log('Déconnecté du serveur MQTT');
});

client.on('error', (err) => {
    console.error('Erreur MQTT:', err);
});
