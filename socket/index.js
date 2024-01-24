const express = require('express');
const admin = require('firebase-admin');
const xbee_api = require('xbee-api');

const serviceAccount = require('./serviceAccountKey.json');

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: 'https://console.firebase.google.com/project/homewave-45d37',
});

const db = admin.firestore();

const app = express();

const xbeeAPI = new xbee_api.XBeeAPI({
    api_mode: 2,
});

// Gestion des données du module Zigbee
xbeeAPI.parser.on('data', function (frame) {
    if (xbee_api.constants.FRAME_TYPE.ZIGBEE_IO_DATA_SAMPLE_RX === frame.type) {
        console.log('ZIGBEE_IO_DATA_SAMPLE_RX');
        if (frame.analogSamples && frame.analogSamples.AD1 !== undefined) {
            const valeurAD1 = frame.analogSamples.AD1;
            console.log('Valeur du capteur AD1 (D1) :', valeurAD1);

            // Stockage dans Firebase
            const dataToSave = {
                timestamp: new Date(),
                value: valeurAD1,
            };

            db.collection('values').add(dataToSave)
                .then((docRef) => {
                    console.log('Document ajouté avec l\'ID :', docRef.id);
                })
                .catch((error) => {
                    console.error('Erreur lors de l\'ajout du document :', error);
                });
        } else {
            console.log('Aucune valeur AD1 (D1) trouvée dans les échantillons analogiques.');
        }
    }
});



const port = process.env.PORT || 3000;
app.listen(port, () => {
    console.log(`Serveur en cours d'exécution sur le port ${port}`);
});
