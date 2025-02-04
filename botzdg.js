const { Client, LocalAuth, MessageMedia } = require('whatsapp-web.js');
const express = require('express');
const { body, validationResult } = require('express-validator');
const socketIO = require('socket.io');
const qrcode = require('qrcode');
const http = require('http');
const fileUpload = require('express-fileupload');
const axios = require('axios');
const mime = require('mime-types');
const port = process.env.PORT || 8000;
const app = express();
const server = http.createServer(app);
const io = socketIO(server);

function delay(t, v) {
  return new Promise(function(resolve) { 
      setTimeout(resolve.bind(null, v), t)
  });
}

app.use(express.json());
app.use(express.urlencoded({
extended: true
}));
app.use(fileUpload({
debug: true
}));
app.use("/", express.static(__dirname + "/"))

app.get('/', (req, res) => {
  res.sendFile('index.html', {
    root: __dirname
  });
});

const client = new Client({
  authStrategy: new LocalAuth({ clientId: 'bot-zdg' }),
  puppeteer: { headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-accelerated-2d-canvas',
      '--no-first-run',
      '--no-zygote',
      '--single-process', // <- this one doesn't works in Windows
      '--disable-gpu'
    ] }
});

client.initialize();

io.on('connection', function(socket) {
  socket.emit('message', 'Iniciado');
  socket.emit('qr', './icon.svg');

client.on('qr', (qr) => {
    console.log('QR RECEIVED', qr);
    qrcode.toDataURL(qr, (err, url) => {
      socket.emit('qr', url);
      socket.emit('message', 'QRCode recebido, aponte a câmera  seu celular!');
    });
});

client.on('ready', () => {
    socket.emit('ready', 'Dispositivo pronto!');
    socket.emit('message', 'Dispositivo pronto!');
    socket.emit('qr', './check.svg')	
    console.log('Dispositivo pronto');
});

client.on('authenticated', () => {
    socket.emit('authenticated', 'Autenticado!');
    socket.emit('message', 'Autenticado!');
    console.log('Autenticado');
});

client.on('auth_failure', function() {
    socket.emit('message', 'Falha na autenticação, reiniciando...');
    console.error('Falha na autenticação');
});

client.on('change_state', state => {
  console.log('Status de conexão: ', state );
});

client.on('disconnected', (reason) => {
  socket.emit('message', 'Cliente desconectado!');
  console.log('Cliente desconectado', reason);
  client.initialize();
});
});

// Send message
app.post('/zdg-message', [
  body('number').notEmpty(),
  body('message').notEmpty(),
], async (req, res) => {
  const errors = validationResult(req).formatWith(({
    msg
  }) => {
    return msg;
  });

  if (!errors.isEmpty()) {
    return res.status(422).json({
      status: false,
      message: errors.mapped()
    });
  }

  const number = req.body.number;
  const numberDDI = number.substr(0, 2);
  const numberDDD = number.substr(2, 2);
  const numberUser = number.substr(-8, 8);
  const message = req.body.message;

  if (numberDDI !== "55") {
    const numberZDG = number + "@c.us";
    client.sendMessage(numberZDG, message).then(response => {
    res.status(200).json({
      status: true,
      message: 'Mensagem enviada',
      response: response
    });
    }).catch(err => {
    res.status(500).json({
      status: false,
      message: 'Mensagem não enviada',
      response: err.text
    });
    });
  }
  else if (numberDDI === "55" && parseInt(numberDDD) <= 30) {
    const numberZDG = "55" + numberDDD + "9" + numberUser + "@c.us";
    client.sendMessage(numberZDG, message).then(response => {
    res.status(200).json({
      status: true,
      message: 'Mensagem enviada',
      response: response
    });
    }).catch(err => {
    res.status(500).json({
      status: false,
      message: 'Mensagem não enviada',
      response: err.text
    });
    });
  }
  else if (numberDDI === "55" && parseInt(numberDDD) > 30) {
    const numberZDG = "55" + numberDDD + numberUser + "@c.us";
    client.sendMessage(numberZDG, message).then(response => {
    res.status(200).json({
      status: true,
      message: 'Mensagem enviada',
      response: response
    });
    }).catch(err => {
    res.status(500).json({
      status: false,
      message: 'Mensagem não enviada',
      response: err.text
    });
    });
  }
});


// Send media
app.post('/zdg-media', [
  body('number').notEmpty(),
  body('caption').notEmpty(),
  body('file').notEmpty(),
], async (req, res) => {
  const errors = validationResult(req).formatWith(({
    msg
  }) => {
    return msg;
  });

  if (!errors.isEmpty()) {
    return res.status(422).json({
      status: false,
      message: errors.mapped()
    });
  }

  const number = req.body.number;
  const numberDDI = number.substr(0, 2);
  const numberDDD = number.substr(2, 2);
  const numberUser = number.substr(-8, 8);
  const caption = req.body.caption;
  const fileUrl = req.body.file;

  let mimetype;
  const attachment = await axios.get(fileUrl, {
    responseType: 'arraybuffer'
  }).then(response => {
    mimetype = response.headers['content-type'];
    return response.data.toString('base64');
  });

  const media = new MessageMedia(mimetype, attachment, 'Media');

  if (numberDDI !== "55") {
    const numberZDG = number + "@c.us";
    client.sendMessage(numberZDG, media, {caption: caption}).then(response => {
    res.status(200).json({
      status: true,
      message: 'Imagem enviada',
      response: response
    });
    }).catch(err => {
    res.status(500).json({
      status: false,
      message: 'Imagem não enviada',
      response: err.text
    });
    });
  }
  else if (numberDDI === "55" && parseInt(numberDDD) <= 30) {
    const numberZDG = "55" + numberDDD + "9" + numberUser + "@c.us";
    client.sendMessage(numberZDG, media, {caption: caption}).then(response => {
    res.status(200).json({
      status: true,
      message: 'Imagem enviada',
      response: response
    });
    }).catch(err => {
    res.status(500).json({
      status: false,
      message: 'Imagem não enviada',
      response: err.text
    });
    });
  }
  else if (numberDDI === "55" && parseInt(numberDDD) > 30) {
    const numberZDG = "55" + numberDDD + numberUser + "@c.us";
    client.sendMessage(numberZDG, media, {caption: caption}).then(response => {
    res.status(200).json({
      status: true,
      message: 'Imagem enviada',
      response: response
    });
    }).catch(err => {
    res.status(500).json({
      status: false,
      message: 'Imagem não enviada',
      response: err.text
    });
    });
  }
});

client.on('message', async msg => {

  const nomeContato = msg._data.notifyName;
  let groupChat = await msg.getChat();
  
  // if (groupChat.isGroup) return null;

  if (msg.type.toLowerCase() == "e2e_notification") return null;
  
  if (msg.body == "") return null;
	
  if (msg.from.includes("@g.us")) return null;

  if (msg.body !== null && msg.body === "") {
    msg.reply("")
  } 
  
  else if (msg.body !== null && msg.body === "") {
    msg.reply("*" + nomeContato + "");
  }
  
  else if (msg.body !== null && msg.body === "") {
    msg.reply("*" + nomeContato + "*, " + "");
  }
  
  else if (msg.body !== null && msg.body === "") {

        const contact = await msg.getContact();
        setTimeout(function() {
            msg.reply(`@${contact.number}` + ' ');  
            client.sendMessage('','' + `${contact.number}`);
          },1000 + Math.floor(Math.random() * 1000));
  
  }
  
  else if (msg.body !== null && msg.body === "") {
    msg.reply("");
  }
  
  else if (msg.body !== null && msg.body === "") {
    msg.reply("*" + nomeContato + "*, " + "");
  }
  
  else if (msg.body !== null && msg.body === "") {
    msg.reply("*" + nomeContato + "*, " + "");
  }

  else if (msg.body !== null && msg.body === "") {
    msg.reply("");
  }
  
  else if (msg.body !== null && msg.body === "") {
    msg.reply("");
  } 
  
  else if (msg.body !== null && msg.body === "") {
    msg.reply("");
  }
  
  else if (msg.body !== null && msg.body === "") {
    msg.reply("");
  }
  
  else if (msg.body !== null && msg.body === "") {

        const contact = await msg.getContact();
        setTimeout(function() {
            msg.reply(`@${contact.number}` + '');  
            client.sendMessage('' + `${contact.number}`);
          },1000 + Math.floor(Math.random() * 1000));
  
  }
  
  else if (msg.body !== null && msg.body === "") {
    msg.reply("");
  }
  
  else if (msg.body !== null && msg.body === "") {
    msg.reply("");
  }
  
  else if (msg.body !== null && msg.body === "") {
    msg.reply("");
  }

  else if (msg.body !== null && msg.body === "") {
    msg.reply("");
  }
  
  else if (msg.body !== null && msg.body === "") {
    msg.reply("");
  } 
  
  else if (msg.body !== null && msg.body === "") {
    msg.reply("");
  }
  
  else if (msg.body !== null && msg.body === "") {
    msg.reply("*" + nomeContato + "*, " + "");
  }
  
  else if (msg.body !== null && msg.body === "") {
        const contact = await msg.getContact();
        setTimeout(function() {
            msg.reply(`@${contact.number}` + '');  
            client.sendMessage('','' + `${contact.number}`);
          },1000 + Math.floor(Math.random() * 1000));
  }
  
  else if (msg.body !== null && msg.body === "") {
    msg.reply("");
  }
  
  else if (msg.body !== null && msg.body === "") {
    msg.reply("");
  }

  else if (msg.body !== null && msg.body === "") {
    msg.reply("");
  }

  else if (msg.body !== null && msg.body === ""){
    const indice = MessageMedia.fromFilePath('');
    client.sendMessage(msg.from, indice, {caption: ''});
    delay(4500).then(async function() {
      msg.reply("");
		});
	  
  }
	else if (msg.body !== null && msg.body === ""){
    const indic = MessageMedia.fromFilePath('');
    client.sendMessage(msg.from, indic, {caption: ''});
    delay(4500).then(async function() {
		  msg.reply("");
    });
	}
    else if (msg.body !== null && msg.body === ""){
    const index = MessageMedia.fromFilePath('');
    client.sendMessage(msg.from, index, {caption: ''});
    delay(4500).then(async function() {
		  msg.reply("");
    });
	}
	 /* else if (msg.body !== null || msg.body === "" || msg.type === '' || msg.hasMedia) {
    msg.reply("");
    const foto = MessageMedia.fromFilePath('./foto.jpeg');
    client.sendMessage(msg.from, foto)
    delay(3000).then(async function() {
      try{
        const media = MessageMedia.fromFilePath('');
        client.sendMessage(msg.from, media, {sendAudioAsVoice: true})
        //msg.reply(media, {sendAudioAsVoice: true});
      } catch(e){
        console.log('audio off')
      }
		});
    delay(8000).then(async function() {
      const saudacaoes = ['Olá ' + nomeContato + ', tudo bem?', 'Oi ' + nomeContato + ', como vai você?', 'Opa ' + nomeContato + ', tudo certo?'];
      const saudacao = saudacaoes[Math.floor(Math.random() * saudacaoes.length)];
      msg.reply(saudacao + " Esse é um atendimento automático, e não é monitorado por um humano. Caso queira falar com um atendente, escolha a opção 4.");
		});
    
	} */
});
  
server.listen(port, function() {
        console.log('Aplicação rodando na porta *: ' + port + ' . Acesse no link: http://localhost:' + port);
});
