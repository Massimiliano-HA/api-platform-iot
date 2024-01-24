const admin = require("firebase-admin");
const serviceAccount = require("./serviceAccountKey.json");

var SerialPort = require("serialport");
var xbee_api = require("xbee-api");
var C = xbee_api.constants;
require("dotenv").config();

const SERIAL_PORT = process.env.SERIAL_PORT;

var xbeeAPI = new xbee_api.XBeeAPI({
  api_mode: 2,
});

let serialport = new SerialPort(
  SERIAL_PORT,
  {
    baudRate: parseInt(process.env.SERIAL_BAUDRATE) || 9600,
  },
  function (err) {
    if (err) {
      return console.log("Error: ", err.message);
    }
  }
);

// Const pour le mqtt ----------------------------------
const mqtt = require("mqtt");

const brokerUrl = "mqtt://mqtt-dashboard.com";
const tcpPort = 1883;
const wsPort = 8083;
const securePort = 8883;
const secureWsPort = 8084;

const clientName = "mqtt-node-client";

const options = {
  clientId: clientName,
};

const client = mqtt.connect(brokerUrl, options);

let valeurAD1;
let dataReceived;

function sendRemoteCommand(command) {
  try {
    const frame = xbeeAPI.buildFrame(command);
    serialport.write(frame);
  } catch (error) {
    console.error('Erreur lors de la construction de la trame XBee :', error);
  }
}



serialport.pipe(xbeeAPI.parser);
xbeeAPI.builder.pipe(serialport);



serialport.on("open", function () {
  var frame_obj = {
    type: C.FRAME_TYPE.AT_COMMAND,
    command: "NI",
    commandParameter: [],
  };

  xbeeAPI.builder.write(frame_obj);

  frame_obj = {
    type: C.FRAME_TYPE.REMOTE_AT_COMMAND_REQUEST,
    destination64: "FFFFFFFFFFFFFFFF",
    command: "NI",
    commandParameter: [],
  };
  xbeeAPI.builder.write(frame_obj);

  // Récuperer les infos du capteur photon (mettre adc) ----------------------------------
  xbeeAPI.parser.on("data", function (frame) {

    if (C.FRAME_TYPE.ZIGBEE_RECEIVE_PACKET === frame.type) {
      // Récupère les données RF
      let dataReceived = "";
      for (let i = 0; i < frame.data.length; i++) {
        dataReceived += String.fromCharCode(frame.data[i]);
      }
      dataReceived = dataReceived.trim();
      console.log(">> ZIGBEE_RECEIVE_PACKET >", dataReceived);

      // Utilise un switch pour gérer différents types de paquets en fonction des données RF
      switch (dataReceived) {
        case "MOTION_DETECTED":
          console.log("Paquet de détection de mouvement");
          // TODO : Envoyer un message MQTT IF motion detected AND STATE  = 0
          break;
        default:
          console.log("Code ");
          console.log(dataReceived);
      }
    }


    if (C.FRAME_TYPE.NODE_IDENTIFICATION === frame.type) {
      // let dataReceived = String.fromCharCode.apply(null, frame.nodeIdentifier);
      console.log("NODE_IDENTIFICATION");
      //storage.registerSensor(frame.remote64)

    } else if (C.FRAME_TYPE.ZIGBEE_IO_DATA_SAMPLE_RX === frame.type) {

      console.log("ZIGBEE_IO_DATA_SAMPLE_RX")
      console.log(frame.analogSamples.AD0)
      //storage.registerSample(frame.remote64,frame.analogSamples.AD0 )

    } else if (C.FRAME_TYPE.REMOTE_COMMAND_RESPONSE === frame.type) {
      // console.log("REMOTE_COMMAND_RESPONSE")
    } else {
      console.debug(frame);
      let dataReceived = String.fromCharCode.apply(null, frame.commandData)
      // console.log(dataReceived);
    }


    if (C.FRAME_TYPE.ZIGBEE_IO_DATA_SAMPLE_RX === frame.type) {
      if (frame.analogSamples && frame.analogSamples.AD1 !== undefined) {
        valeurAD1 = frame.analogSamples.AD1;
        console.log("Valeur du capteur AD1 (D1) :", valeurAD1);

        //Envoyer une commande pour allumer la LED si valeurAD1 est entre 40 et 50
        if (valeurAD1 >= 40 && valeurAD1 <= 50) {
          const remoteCommand = {
            type: C.FRAME_TYPE.REMOTE_AT_COMMAND_REQUEST,
            destination64: "FFFFFFFFFFFFFFFF",
            command: "D0",
            commandParameter: [0x05],
          };
          console.log('Rien à signaler !');
          sendRemoteCommand(remoteCommand);
        } else {
          const remoteCommand = {
            type: C.FRAME_TYPE.REMOTE_AT_COMMAND_REQUEST,
            destination64: "FFFFFFFFFFFFFFFF",
            command: "D0",
            commandParameter: [0x04],
          };
          console.log('Intrusion ! Lumiere allumée !');
          sendRemoteCommand(remoteCommand);
        }

      }
    }
  });
});

client.on('connect', () => {
  console.log('Connecté au serveur MQTT');

  client.subscribe('object ', (err) => {
    if (!err) {
      console.log('Abonné au sujet (topic) "object"');
    }

    setInterval(() => {
      // Valeur du digicode
      if (dataReceived !== undefined) {
        publishDataToTopic('object', dataReceived);
      } else {
        console.log('Pas de valeur du digicode');
      }

      //console.log(valeurAD1 + ' ' + dataReceived);

    }, 7000);
  });
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
