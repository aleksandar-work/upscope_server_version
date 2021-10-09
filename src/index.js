require('./models/userModel');
require('./models/conversationModel');
require('./models/appointmentModel');
require('./models/licenseModel');

const express = require('express')
const mongoose = require('mongoose');
const app = express();
const bodyParser = require('body-parser');
const helmet = require('helmet');
const socketIo = require('socket.io');
const crypto = require('crypto');
const multer = require('multer');
const GridFsStorage = require('multer-gridfs-storage');
const Grid = require('gridfs-stream');
const path = require('path');


//Enable DotEnv
const dotenv = require('dotenv');
dotenv.config();
//Prevent Cors Origin Error
const cors = require('cors');
app.use(cors());
app.use(express.static('public'));


//const dbPwd = 'pxXFD91S9LQDOlt7'
// PRODUCTION CONNECTION
const mongoUri = `mongodb+srv://ezuzer:${process.env.MONGD_PWD}@ezlead-0-qgcf5.gcp.mongodb.net/ezlead-cust0?retryWrites=true&w=majority`;
const port = process.env.PORT || 8080;

const conn = mongoose.createConnection(mongoUri, {
  useNewUrlParser: true,
  useUnifiedTopology: true
});

// Create storage engine
const storage = new GridFsStorage({
  url: mongoUri,
  file: (req, file) => {
    return new Promise((resolve, reject) => {
      crypto.randomBytes(16, (err, buf) => {
        if (err) return reject(err);
        const filename = buf.toString('hex') + path.extname(file.originalname);
      const fileInfo = {
        filename: filename,
        bucketName: 'uploads'
      };
      resolve(fileInfo);
    });
  });
  }
});

const upload = multer({ storage });

const authRoutes = require('./routes/authRoutes');
const webConversationRoutes = require('./routes/webConversationRoutes');
const bizConversationRoutes = require('./routes/bizConversationRoutes');
const webAppointmentRoutes = require('./routes/webAppointmentRoutes');
const bizAppointmentRoutes = require('./routes/bizAppointmentRoutes');
const bizNotificationRoutes = require('./routes/bizNotificationRoutes')
const emailRoutes = require('./routes/sendEmail');
const licenseRoutes = require('./routes/licenseRoutes');
const videoRoutes = require('./routes/videoRoutes');
const bizAnalyticsRoutes = require('./routes/bizAnalyticsRoutes');

/**
 * Load balancer proxy protection
 */
app.set('trust proxy', true);

/**
 * Body that we expect out our APIs
 */
app.use(bodyParser.json({ limit: '6mb' }));
app.use(bodyParser.text({ limit: '6mb' }));
/**
 * CORS
 */

app.use(authRoutes);
app.use(webConversationRoutes);
app.use(bizConversationRoutes);
app.use(webAppointmentRoutes);
app.use(bizAppointmentRoutes);
app.use(emailRoutes);
app.use(licenseRoutes);
app.use(videoRoutes);
app.use(bizNotificationRoutes);
app.use(bizAnalyticsRoutes);
app.use(helmet());

app.get('/', (req, res) => {
  res.send('enjoy the silence Application updated');
});

//mongoose.set('debug', true);

/**
 * Establishing Connection to database
 */
function connectDB() {
  
  mongoose.connect(mongoUri, {
    useNewUrlParser: true,
    useCreateIndex: true,
    useUnifiedTopology: true
  });
  mongoose.connection.on('connected', () => {
    console.log('connected to mongo instance');
    // SERVE APPLICATION
    const server = app.listen(port, () => {
      console.log(`express on port ${port}`);
    });

    connectSocketIo(server);

  });
  mongoose.connection.on('error', (err) => {
    console.log('mongo connection error', err);
    // TODO: send error response ...
  });

  conn.on('open', () => {
    console.log("connected");
    gfs = Grid(conn.db, mongoose.mongo);
    gfs.collection('uploads');
  });
}

/**
 * Establishing Socket.io
 * @param {ExpressServer} server 
 */
function connectSocketIo(server) {
  app.set('io', socketIo(server));
  app.get('io').on('connection', socket => {
    console.log('socket is connected. You are being served on', port);
    //console.log(server);
  });
  
}


app.get('/files', (req, res) => {
  gfs.files.find().toArray((err, files) => {
    if (!files || files.length === 0) return res.status(404).json({ err: 'No files exist' });
    return res.json(files);
  });
});

app.get('/video/:filename', (req, res) => {
  gfs.files.findOne({ filename: req.params.filename }, (err, file) => {
    if (!file || file.length === 0) return res.status(404).json({ err: 'No file exists' });
    if (file.contentType === 'video/mp4') {
      const readstream = gfs.createReadStream(file.filename);
      readstream.pipe(res);
    } else {
      res.status(404).json({ err: 'Not an video' });
    }
  });
});

app.post('/upload', upload.single('file'), (req, res) => res.json({message: "success"}));
connectDB();
