const { response } = require('express');
const moment = require('moment');
const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const User = mongoose.model('User');
const Message = mongoose.model('Message');
const Conversation = mongoose.model('Conversation');

const notificationSchema = require("../models/notificationModel");
const Notification = mongoose.model('Notification', notificationSchema)

const axios = require('axios');
const { empty } = require('../shared/utils');
const { upscopeServer } = require('../shared/server')
const { google } = require('googleapis');
const scopes = 'https://www.googleapis.com/auth/analytics.readonly' //Scope for the google analytics
const jwt = new google.auth.JWT(
  'google-analytics-api@pragmatic-mote-305701.iam.gserviceaccount.com',
  null,
  "-----BEGIN PRIVATE KEY-----\nMIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQDTk4i0BB1lYclW\nNxfzREeZey7Ov9eNzQgbns3IYQ4yWxQkCHeGRyvuIya8hloO7aFsp6i5IQML73x6\n19BDMzP9WMga6sJzrdn8qg/RqjyHXdIrZ7ZokLam6cqGrgNQ4amHSngbWrr58/gi\nllX9xJtSO8rFWEQIIT3xMjPGF/YWRksqo/dDhmyXXZV6WyZ+VpzeJR1ZNI8oigi2\n0JyuNSZwZ2pf22Cw/NwGON0IagkjsrGr/2UoHGvU4i79DNNWy9t8n/+73UBTkD39\nvA3aXhPwzWUAQOqcjFrIGg319pZ7u7Ja1DMI/ptyAMntiqiJMw23LVKsx1PsWPyV\nV4UErWd5AgMBAAECggEAZA837XqstE+kukNf7kpyWiGpp1mPBZ7boMRfqc5Mun/c\nbJYcgMKUAhFZtnsLiFfVqd84qiT0neZqxmXeNom2orAkIqa3w6GKoDWFObD640H5\nrVFlMNqPpyyV/U+6fbvbQwJy/uzP1HoO9byHenZKxn9EjEQMGJQwCSum1J5sYWeM\nguCN3wVgidly1GmWrsZ4+beZRRmjwxz27tXMmmi+GgKF1x2D7P5yGxgU+KTozSPi\nTzrdAuHQsEQk1Xiegd4OUqtAuGbXNi56+iOtxsdvbwCRSL+wxrsndavI3lQ7h+wo\nGb/9crzY2EttocN10/ov9eyriWXXJ5SElBs5VHTCKQKBgQD3oEQblDyi35gDWYnB\n1Z1pkEemcAMFNl9xWkHaMwzjL6f5iJilKCwwVWS908wijThu4RsNW8Buuf33EEaY\nrO80M8sR86AJpL/YYvil+b9iG1bDjZMvp0MJYfdKO0O6WeiJxuvJFtSm1atIv0wR\n8ldNOWfr+w4iA2v0PzNTkKIIjwKBgQDauy4lMwDGs4KHn4BOqzmOwOreuqarlvDO\nZ9WVKrar7f9Sf3MCi/vX1Yys3okbg+u0I5MVGGhQzsvtC8TkKhBTB6qgvSiEoQ5V\ntTSQWJK/2uouVJbBfw7jNU+X879RDfzaZH8kjwulX+M1P3tM1cwCb35Bwac3pZiI\n7y2UsAJDdwKBgQDvRZ9J/tzwjJk4c2ZXM/ActttlCcsBWF61Cv+itb14MO5gggrt\nW3oHYhwsCOGxaT/kdANNzyCMXY/3EXUFxeSFTp6kRAKaDuWJU2jsB/1T8RLPdpeI\nbliqUk0/HzD8ei/mIZ5n+nWUl9YgPyhkFwUgi53NOhOX7jJ8Gi2gS5smJQKBgAqI\ngQxhjGQFOP/2+mLPdBIf0C+xpV0WA7qs3Wg1il51M5pxcMRqoVIfgorAnLGqhKtE\nG00kw8FAdCmSK4UhUW/uKpVbBpx8dQhDlaht24NJs4VPpYLj73+ZjZ+vqULp/Yc2\n17iW+uSX3YUu7W0hzpU/cUERZlATtWjCu9sxLqq5AoGBAJNEhhT2EJkbwlc4hAZm\nTpNG20pL/9Eshu6uccNQ92LxrvGe/nG35dmcUHxoZ7JGfvaVvhJkvchAQtstbI9B\nRlcx1O12nECoID10u4PhOy2L2dKbOMk25eS++QMVqKnyK66/fkabTonJut0sPgsk\n6HDPqSmLRSLSMTB6uKa/kbri\n-----END PRIVATE KEY-----\n",
  scopes
)

// Get the acive dealer lists
router.post('/web/conv/get-active-users', async (req, res) => {
  try {
    const domain = req.body.domain;
    if (!domain) return res.status(400).json({ error: 'Domain cannot be empty.' });
    else {
      let activeUsers = await User.find({ domain, active: true });
      return res.status(200).json({ activeUsers });
    }
  }
  catch (err) {
    return res.status(500).json({ error: 'There is some error in Server.' });
  }
})

router.post('/web/conv/get-init-messages', async (req, res) => {
  try {
    const { shortID } = req.body;
    let conversation = await Conversation.findOne({ shortId: shortID }).populate(
      {
        path: 'messages.sender',
        select: 'name title'
      }
    );
    conversation = await getConversation(conversation._id);
    return res.status(200).json({ conversation });
  }
  catch (err) {
    return res.status(500).json({ error: err })
  }
})

router.put('/web/conv/add-msg', async (req, res) => {

  try {

    const { shortID, message, domain, url } = req.body;
    if (empty(shortID)) return res.status(400).json({ error: 'ShortID cannot be empty.' });

    // Attempt to find matching Conversation for this shortID 
    let conversation = await Conversation.findOne({ shortId: shortID }).populate({
      path: 'messages.sender',
      select: 'name title'
    });

    // If we can't find a Conversation, create a new one.   
    // Note: with the way the timing of requests currently works, this should almost never trigger (add-url gets called first, which creates the Conversation)
    if (!conversation) {

      conversation = new Conversation({
        shortId: shortID,
        domain: domain,
        urls: {
          url: url,
          times: 0
        },
        messages: []
      });

      // Create the first Message and push it to the Conversation list of Messages
      let msg = new Message({ message });
      conversation.messages.push(msg);

      // Save to DB
      await conversation.save();

    } else {

      // Otherwise, push a new message to existing conversation 
      let msg = new Message({ message });
      conversation.messages.push(msg);

      // Save to DB 
      await conversation.save();

    }

    let shortId = conversation.shortId;

    // Retrieve the Conversation again from the DB, with updated info
    conversation = await getConversation(conversation._id);

    // Create Notifications for all salespeople if no owner is present
    let activeUsers = await User.find({ domain, active: true });
    for (let activeUser of activeUsers) {
      if (conversation.owner) {
        if (conversation.owner.toString() !== activeUser._id.toString()) {  // only push notifications to owner if the conversation is claimed
          continue;
        }
      }
      let newNotification = new Notification({
        saler: activeUser._id,
        domain: domain,
        conversation: conversation._id,
        shortId: shortId,
        type: "new",
        isread: false
      });
      await newNotification.save();
    }

    // Emit Socket Events
    req.app.get('io').emit(`customer-message-${shortId}`, conversation.messages);
    req.app.get('io').emit('message-notif');
    req.app.get('io').emit(`customer-message-update`, { trigger: 'message', conversation: conversation });

    return res.status(200).json({
      message: {
        createdAt: new Date(),
        updatedAt: new Date(),
        message
      }
    });

  } catch (err) {
    return res.status(500).json({ error: "There is some error on server side." });
  }
});

//YOU ARE HERE////////////////////////////////////////

router.post('/web/conv/request-salesperson', async (req, res) => {
  try {
    const { shortID } = req.query;

    if (empty(shortID)) return res.status(400).json({ error: 'ShortID cannot be empty.' });
    req.app.get('io').emit(`customer-request`, shortID);

    let conversation = await Conversation.findOne({ shortId: shortID });

    if (conversation) {

      conversation.requested = true;
      await conversation.save();
      res.send({ message: `Saved true to this ID: ${shortID}` });
    }

    // return res.status(200).json({message: `SENT A RESPONSE. ${shortID}`});
  } catch (err) {
    return res.status(500).json({ error: err });
  }
});

// Quick route for client to lookup the original domain for a Upscope shortId 
router.get(`/web/conv/get-domain`, async (req, res) => {

  try {

    const { shortId, domain } = req.query;

    if (empty(shortId) || empty(domain)) return res.status(400).json({ error: "No shortId or domain in query" });

    let conversation = await Conversation.findOne({ shortId: shortId });

    if (!conversation) {

      return res.status(200).json({ domain: "" }); 

    } else {    

      if (!conversation.domain) {

        // older conversation that doesn't have a domain.  Add the latest domain 
        let response = await Conversation.findOneAndUpdate({ shortId: shortId }, { domain: domain });
        return res.status(200).json({ domain });
      }

      // otherwise, return the conversation's original domain;
      return res.status(200).json({ domain: conversation.domain });
    }

  } catch(err) {
    console.error(err);
    return res.status(500).json({ error: err });
  }

});

router.get('/web/conv/add-url', async (req, res) => {

  try {

    const { shortId, url, domain } = req.query;
    if (empty(shortId) || empty(url)) return res.status(400).json({ error: 'Parameters cannot be empty' });
    let conversation = await Conversation.findOne({ shortId }).populate(
      {
        path: 'messages.sender',
        select: 'name title'
      }
    );

    if (!conversation) {
      conversation = new Conversation();
      conversation.shortId = shortId;
      conversation.domain = domain; // set the domain on creation of conversation
      let tempObject = {
        url,
        times: 0
      }
      conversation.urls.push(tempObject);
      await conversation.save();
    } else {
      conversation.shortId = shortId;
      let urls = conversation.urls;
      let flag = false;
      for (let i = 0; i < urls.length; i++) {
        if (urls[i].url === url) {
          conversation.update()
          urls[i].times += 1;
          flag = true;
          conversation.urls = urls;
          await Conversation.updateOne({ _id: conversation._id }, { $set: { urls: urls } });
        }
      }
      if (!flag) {
        let tempObject = {
          url,
          times: 0
        }
        conversation.urls.push(tempObject);
        await conversation.save();
      }
    }
    return res.status(200).json({ message: 'Url saved successfully' });
  } catch (err) {
    return res.status(500).json({ error: err });
  }
});

router.put('/web/conv/prog-msg', async (req, res) => {
  try {
    setTimeout(async () => {
      let shortId = req.body.shortId;
      if (empty(shortId)) {
        return res.send('invalid');
      }
      let progMessage = req.body.prog;
      req.app.get('io').emit(`customer-prog-message-${shortId}`, progMessage);
      return res.send('prog');
    }, 1000);
  } catch (err) {
    return res.send('error');
  }
});

router.post('/customer/video/stop', async (req, res) => {
  const { sessionId } = req.body;
  req.app.get('io').emit('customer-video-end', sessionId);
  return res.status(200).json({ message: 'Video has been ended.' })
});

router.get('/dealer/video/stop', async (req, res) => {
  let shortId = req.query.shortId;
  req.app.get('io').emit(`dealer-video-end`);
  return res.status(200).json({ message: 'Video has been ended.' })
});

// get a full conversation by ID
router.get('/web/conv/view', async (req, res) => {
  try {
    let convId = req.query.convId;
    if (empty(convId)) {
      return res.send('invalid');
    }
    let conversation = await getConversation(convId);
    return res.send({ conversation });
  } catch (err) {
    return res.send('error');
  }
});

router.get('/web/conv/new-user-refresh', async (request, response) => {
  try {
    request.app.get('io').emit('reload-vistors-list');
    return response.status(200).json({ message: "Send successfully." });
  } catch (error) {
    return response.status(500).json({ error });
  }
})

router.post('/web/conv/time-test', async (req, response) => {
  const view_id = '237894468';
  jwt.authorize((err, res) => {
    google.analytics('v3').data.ga.get(
      {
        auth: jwt,
        ids: 'ga:' + view_id,
        'start-date': '30daysAgo',
        'end-date': 'today',
        // 'dimensions': 'ga:sessionDurationBucket',
        // 'metrics': 'ga:sessions, ga:sessionDuration',
        'dimensions': 'ga:dimension5',
        'metrics': 'ga:sessions, ga:sessionDuration',
      },
      (err, result) => {
        return response.status(200).json({ result });
      }
    )
  })
})

router.get('/web/conv/get-latest-session', async (req, response) => {
  try {
    const { shortId } = req.query;
    if (!shortId) return response.status(400).json({ error: "Invalid Short ID" });

    // Get Sessions for this User 
    let sessionData = await upscopeServer.get(`/v1.1/visitors/${shortId}.json`);

    if (sessionData && sessionData.data && sessionData.data.visitor && sessionData.data.visitor.sessions && sessionData.data.visitor.sessions[0]) {
      return response.status(200).json({
        length_seconds: sessionData.data.visitor.sessions[0].length_seconds,
        is_in_session: sessionData.data.visitor.is_in_session
      });
    } else {
      return response.status(404).json({ error: "No Sessions Found" });
    }
  } catch {
    return response.status(500).json({ error: "Server Error" });
  }
});

const removeUnactivityUsers = (visitors) => {
  let recent = moment();
  visitors = visitors.filter(visitor => recent.diff(moment(visitor.last_seen_at), 'days') < 7);
  return visitors;
}

const removeLeavedUsers = (visitors) => {
  visitors = visitors.filter(visitor => visitor.is_online || visitor.conversation);
  return visitors;
}

// const addConversation = (visitors) => {
//   let temp = [];
//   for(let visitor of visitors){
//     if(visitor.conversation === undefined || Object.keys(visitor.conversation).length === 0 || visitor.conversation.messages.length == 0){
//       console.log("conversation is undefined");
//       let conversation = {
//         messages: [
//           {
//             message: "First Message",
//             updatedAt: '2000-03-26T15:49:06.781Z'
//           }
//         ]
//       }
//       visitor.conversation = conversation;
//       temp.push(visitor);
//       console.log(visitor);
//     }
//     else temp.push(visitor);
//   }
//   return temp;
// }

const filterByDomain = (visitors, domain) => {

  // Filter visitors by original domain on initial creation of Conversation (conversation.domain)
  return visitors.filter(visitor => {
    if (visitor.conversation && visitor.conversation.domain && visitor.conversation.domain !== domain) {
      return false;
    }
    return true;
  });

};

//get the users list visiting website
router.post('/web/conv/get-visitors-list', async (req, response) => {

  const { role, id, domain } = req.body;

  try {
    upscopeServer.get('/v1.1/list.json?max_results=100').then(async (res) => {
      let visitors = res.data.visitors;
      //Remove the users who didn't have activity for 7 days
      visitors = removeUnactivityUsers(visitors);
      for (let i = 0; i < visitors.length; i++) {
        let dealer_count = 0; let customer_count = 0;
        let conversation = await Conversation.findOne({ shortId: visitors[i].short_id }).populate({ path: 'owner', select: 'name' }).populate({ path: 'owner', select: 'avatar' });
        if (conversation) {
          visitors[i].conversation = conversation;
          if (conversation.messages) {
            for (let message of conversation.messages) {
              if (message.sender) dealer_count++;
              else customer_count++;
            }
          }
          visitors[i].dealer_count = dealer_count;
          visitors[i].customer_count = customer_count;
        }
      }
      if (role == 2) visitors = visitors.filter(visitor => {
        if (visitor.conversation == undefined) return true;
        else {
          if (visitor.conversation.owner !== undefined) {
            if (visitor.conversation.owner._id == id) return true;
            else return false;
          }
          else return true;
        }
      })
      visitors = removeLeavedUsers(visitors);
      // visitors = addConversation(visitors);
      visitors = filterByDomain(visitors, domain);
      return response.status(200).json({ visitors });
    }).catch(err => {
      return response.status(500).json({ error: err })
    })
  } catch (err) {
    return response.status(500).json({ error: err })
  }
});

router.post('/web/conv/get-histories', async (request, response) => {
  try {
    const { shortID } = request.body;
    if (!shortID) return res.status(400).json({ error: "There should be ShortID" });
    if (shortID) {
      upscopeServer.get(`/v1.1/visitors/${shortID}.json?with_history=true`).then(async (res) => {
        let histories = res.data.visitor.history;
        return response.status(200).json({ histories });
      })
    }
    else return response.status(400).json({ error: 'short id cannot be empty' });
  } catch (err) {
    return response.status(500).json({ error: 'There is some error in the server side.' })
  }
})

router.post('/web/conv/get-screensharing-url', async (request, response) => {
  const { shortId } = request.body;
  try {
    let data = {
      "branding": {
        "naked": true,
      },
      "permissions": {
        "allow_click": true
      },
      "agent": {
        "id": "u_n2mxooeo",
        "name": "Dealer"
      },
      "metadata": {
        "key": "value"
      }
    }
    upscopeServer.post(`https://api.upscope.io/v1.1/visitors/${shortId}/watch_url.json`, data).then(res => {
      return response.status(200).json({ watch_url: res.data.watch_url });
    })
  } catch (err) {
    return response.status(500).json({ error: 'There is some error in the server side.' });
  }
})

//Get the visitors status from the conversation list with the short_id
router.post('/web/conv/get-visitor-status', async (request, response) => {
  try {
    const { shortId } = request.body;
    if (!shortId) return res.status.json({ error: 'Short ID cannot be empty. Please select shortID' });
    let conversations = await Conversation.find({ shortId });
    if (conversations.length > 0) {
      return response.status(200).json({ isconv: true });
    }
    else return response.status(200).json({ isconv: false });
  } catch (err) {
    response.status(500).json({ error: 'There is some error in the server side.' })
  }
});

router.post('/web/conv/save-customer-info', async (req, res) => {
  try {
    const { shortId, email, message, name, phone } = req.body;
    if (!shortId) return res.status(400).json({ error: 'ShortID cannot be empty' });
    if (!email || !name) return res.status(400).json({ error: 'Invalid Request' });
    let conversation = await Conversation.findOne({ shortId });
    if (conversation) {
      conversation.name = name;
      conversation.email = email;
      conversation.phone = phone;
      let msg = new Message({ message });
      conversation.messages.push(msg);
      await conversation.save();
      res.send({ message: 'Successfully Saved' });
    }
  } catch (err) {
    res.status(500).json({ error: err });
  }
})

async function getConversation(convId) {
  let conversation = await Conversation.findById(convId).populate(
    {
      path: 'messages.sender',
      select: 'name title'
    }
  )
  return conversation;
}


module.exports = router;