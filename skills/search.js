const axios = require('axios');

const ASPECT_DISCOVERY_ENDPOINT = 'http://35.240.240.251/api/v1/real-estate-extraction';
const SEARCH_ENDPOINT = 'http://35.240.208.167/api/v1/posts';
const RECOM_ENDPOINT = 'http://35.186.146.65/recom/v1/posts';
const NUM_RESULTS = 5;
const MAX_RESULTS = 30;
const MAX_RECOM = 5;

const ASPECTS = {
  "addr_street": "Đường",
  "addr_district": "Quận",
  "addr_city": "Thành phố",
  "addr_ward": "Phường",
  "position": "Vị trí",
  "area": "Diện tích",
  "price": "Giá",
  "transaction_type": "Loại giao dịch",
  "realestate_type": "Loại BĐS",
  "legal": "Pháp lý",
  "potential": "Tiềm năng",
  "surrounding": "Khu vực",
  "surrounding_characteristics": "Đặc điểm khu vực",
  "surrounding_name": "Xung quanh",
  "interior_floor": "Số tầng",
  "interior_room": "Phòng",
  "orientation": "Hướng",
  "project": "Dự án"
}



module.exports = function (controller) {
function compare(array1,array2) {
    if (array1.length != array2.length)
        return false;

    for (var i = 0, l=array1.length; i < l; i++) {
        if (array1[i] instanceof Array && array2[i] instanceof Array) {
            if (!compare(array1[i],array2[i]))
                return false;       
        }           
        else if (array1[i] != array2[i]) { 
            return false;   
        }           
    }       
    return true;
}

  const history = {};

  function unhandledMessage(bot, message) {
    console.log(message)
    bot.startConversation(message, function (err, convo) {
      convo.say('Tôi không hiểu ý bạn lắm :)');
    });

  }

  function hello(bot, message) {
    bot.reply(message, "Xin chào, bạn cần tìm bất động sản như thế nào?")
  }

  function getCurrentAspects(data) {
    return data.filter(x => x.type != 'normal').map(item => {
      item.title = ASPECTS[item.type]
      return item
    })
  }

  async function check_aspects(text) {
    try {
      let result = await axios.post(
        ASPECT_DISCOVERY_ENDPOINT,
        JSON.stringify([text]),
        {
          headers: {
            'Content-Type': 'application/json'
          }
        });
      let tags = result.data[0].tags;
      return tags;
    } catch (error) {
      throw new Error(error)
    }
  }

  async function callSearchAPI(data, isText = true, skip = 0) {
    let requestBody = {
      limit: MAX_RESULTS,
      skip: skip,
      string: isText,
    }
    if(isText)
    	requestBody.query = data
    else
    	requestBody.tags = data
   	console.log(requestBody	)
    try {
      let results = await axios.post(SEARCH_ENDPOINT, JSON.stringify(requestBody), {
        headers: {
          'Content-Type': 'application/json'
        }
      })
      return results;
    } catch (error) {
      console.log(error);
      throw new Error(error);
    }
  }

  function hasUsefulAspects(tags) {
    let filtered = tags.filter(x => x.type !== 'normal')
    return filtered;
  }
  function getQuesion(attrName,attrValue,badAspect) {
  	let question = {} 
  	var temp = []
  	if(badAspect == 'none'){
	  	if(attrName=='addr_street' ||
	  		attrName=='addr_district' || 
	  		attrName=='addr_ward'|| 
	  		attrName=='addr_city'){
		    question.text ='Bạn có muốn BDS này ở:'
		}
		else if(attrName=='surrounding'||
			attrName=='surrounding_name'||
			attrName=='surrounding_characteristics'){
		    question.text = 'Bạn có muốn khu vực xung quanh hay gần BDS là:'
		}
		else if(attrName=='interior_room'||
			attrName=='interior_floor'||
			attrName=='legal'){
		    question.text = 'Bạn muốn BDS có:'
		}
		else if(attrName=='orientation'){
		        question.text ='Bạn có muốn BDS có hướng:'
		}
		else if(attrName=='area'){
		        question.text ='Bạn có muốn BDS có kích trước:'
		}
		else if(attrName=='transaction_type'){
		        question.text ='Bạn muốn:'
		}
		else if(attrName=='realestate_type'){
		        question.text ='Bạn muốn BDS là:'
		}
		else if(attrName=='price'){
		        question.text ='Bạn có muốn BDS có giá:'
		}
		else if(attrName=='position'){
		    question.text ='Bạn muốn BDS có chỗ ra vào ở:'    
		}
	  	else if(attrName=='potential'){
		    question.text ='Bạn dùng BDS này để:'    
		}
		else if(attrName=='project'){
		    question.text ='Bạn có muốn BDS thuộc project:'    
		}
		else {
			question.text ='Những lựa chọn khác'
		}
		for (var i = 0; i < attrValue.length; i++) {
		    var dict = {};
		    dict.title = attrValue[i];
		    dict.payload = attrValue[i];
		    console.log(attrValue[i])
		    temp.push(dict)
		}
	}
	else{
		question.text ='Lựa chọn thay thế '+ badAspect['content']
		for (var i = 0; i < attrValue.length; i++) {
		    var dict = {};
		    dict.title = attrValue[i];
		    dict.payload = 'Thay thế '+attrValue[i];
		    console.log(attrValue[i])
		    temp.push(dict)
		}
	}
	var dict = {
		title:'Không quan tâm',
		payload:'Đi đến tư vấn tiếp theo'
	};
	temp.push(dict)
	question.quick_replies = temp
	return question;
  }
  async function query(input, message, isText = true) {
    try {
      let results = await callSearchAPI(input, isText);
      let tags = []
      if(isText)
	    tags = await check_aspects(input)
	  else
	  	tags = input;
      results = results.data;
      let queryData = results.data;
      let aspects = hasUsefulAspects(tags);
      console.log(aspects);
      if (aspects && aspects.length > 0) {
        let userId = message.user;
        history[userId] = {
          offset: NUM_RESULTS,
          data: queryData,
          query: aspects,
          text: isText ? message.text : '',
        };
        queryData = queryData.slice(0, NUM_RESULTS);
        return queryData;
      } else {
        // bot.reply(message, 'Bạn vui lòng cung cấp yêu cầu về bất động sản cần tìm')
      }
    } catch (error) {
      console.log(error);
      throw new Error(error)
    }
  }
  //recomendation
  async function recomApi(userId) {
  	let data = history[userId].query
  	let requestBody = {}
  	requestBody.numre = MAX_RECOM
    requestBody.tags = data
    try {
      let results = await axios.post(RECOM_ENDPOINT, JSON.stringify(requestBody), {
        headers: {
          'Content-Type': 'application/json'
        }
      })
      console.log(results.data)
      return results;
    } catch (error) {
      console.log(error);
      throw new Error(error);
    }
  }
  //end recomendation
  
  async function search(bot, message, isText = true, realMessageObject = null) {
    if (!realMessageObject) realMessageObject = message;
    try {
      let queryData = await query(isText ? message.text : message, message, isText)
      bot.startConversation(realMessageObject, function (err, convo) {
        if (queryData && queryData.length > 0) {
          convo.say({
            text: `Đây là ${NUM_RESULTS} kết quả tìm được theo yêu cầu của bạn`,
            articles: queryData
          })
          let test = {
            text: 'Bạn có muốn xem thêm kết quả không',
            quick_replies: [
              {
                title: 'CÓ',
                payload: 'Xem thêm kết quả'
              },
              {
                title: 'KHÔNG',
                payload: 'Ngừng xem kết quả'
              },
              {
                title: 'Tư vấn',
                payload: 'Bắt đầu tư vấn'
              },
            ],
          };
          convo.say(test)
        }
        else {
          convo.say('Không tìm được kết quả nào với yêu cầu của bạn. Bạn vui lòng tìm kiếm với yêu cầu khác')
        }
      });
    } catch (error) {
      console.log(error);
      bot.reply(message, "Đã có lỗi xảy ra, bạn vui lòng thử lại với yêu cầu khác")
    }
  }
  controller.hears('Xem thêm kết quả', 'message_received', function (bot, message) {
    bot.startConversation(message, function (err, convo) {
      let user = message.user;
      let result;
      if (history[user] != undefined) {
        result = history[user].data
        //TODO check no more results
        result = result.slice(history[user].offset, history[user].offset + NUM_RESULTS)
        history[user].offset = history[user].offset + NUM_RESULTS;
      }
      if (result) {
        convo.say({
          text: `Đây là ${NUM_RESULTS} kết quả tiếp theo`,
          articles: result
        })
        convo.say({
          text: 'Bạn có muốn xem thêm kết quả không',
          quick_replies: [
            {
              title: 'CÓ',
              payload: 'Xem thêm kết quả'
            },
            {
              title: 'KHÔNG',
              payload: 'Ngừng xem kết quả'
            },
          ]
        });
      }
    });
  })

  controller.hears('Ngừng xem kết quả', 'message_received', function (bot, message) {
    bot.startConversation(message, function (err, convo) {
      convo.say({
        text: 'Bạn có muốn chỉnh sửa yêu cầu tìm kiếm không?',
        quick_replies: [
          {
            title: 'Thêm yêu cầu',
            payload: 'Thêm yêu cầu'
          },
          {
            title: 'Bỏ yêu cầu',
            payload: 'Bỏ yêu cầu'
          },
          {
            title: 'Tìm kiếm khác',
            payload: 'Tìm kiếm khác'
          },
          {
            title: 'Kết thúc',
            payload: 'Kết thúc'
          },
        ]
      });
    });
  })
  async function addAspects(oldAspect, aspects) {
    try {
      let tags = await check_aspects(aspects)
      let newQuery = oldAspect.concat(tags)
      console.log(newQuery)
      return newQuery
    } catch (error) {
      throw new Error(error)
    }
  }

  controller.hears('Thêm yêu cầu', 'message_received', function (bot, message) {
    let user = message.user;
    if (history[user] == undefined) {
      bot.reply(message, "Bạn chưa có yêu cầu nào trước đó")
      return;
    }
    else {
      let oldQuery = history[user].query;
      let currentAspects = getCurrentAspects(oldQuery)
      bot.startConversation(message, function (err, convo) {
        convo.say({
          text: 'Đây là những yêu cầu hiện tại của bạn',
          aspects_list: currentAspects,
        });
        convo.addQuestion("Bạn cần thêm yêu cầu gì?", async (message, convo) => {
          try {
            let newQuery = await addAspects(currentAspects, message.text)
            newQuery = getCurrentAspects(newQuery)
            history[user].query = newQuery
            convo.say({
              text: 'Đây là những yêu cầu hiện tại của bạn',
              aspects_list: newQuery,

            });
            search(bot, newQuery, false, message)
          } catch (error) {
            // console.log(error)
            throw new Error(error)
          }
          convo.next();
        }, {}, 'default')
      });
    }
  })


  function removeAspect(oldQuery, aspects) {
    let newQuery = oldQuery.filter(x => !aspects.includes(x.content))
    return newQuery;
  }

  controller.hears('Bỏ yêu cầu: ', 'message_received', function (bot, message) {
    let user = message.user;
    if (history[user] == undefined) {
      bot.reply(message, "Bạn chưa có yêu cầu nào trước đó")
      return;
    }
    else {
      let oldMess = history[user];
      let toRemoveAspects = message.text.slice('Bỏ yêu cầu: '.length)
      toRemoveAspects = toRemoveAspects.split(',').map(x => x.trim());
      let result = removeAspect(oldMess.query, toRemoveAspects)
      history[user].query = result
      bot.startConversation(message, function (err, convo) {
        convo.say({
          text: 'Đây là những yêu cầu hiện tại của bạn',
          aspects_list: result,
        });
        console.log(result)
        search(bot, result, false, message)

      });
    }
  })

  controller.hears('Bỏ yêu cầu', 'message_received', function (bot, message) {
    let user = message.user;
    if (history[user] == undefined) {
      bot.reply(message, "Bạn chưa có yêu cầu nào trước đó")
      return;
    }
    else {
      let oldMess = history[user];
      let replies = getCurrentAspects(oldMess.query)
      bot.startConversation(message, function (err, convo) {
        convo.say({
          text: 'Đây là những yêu cầu hiện tại của bạn',
          multiple_replies: replies,
        });
      });
    }
  })

  controller.hears('Tìm kiếm khác', 'message_received', function (bot, message) {
    bot.reply(message, "Mời bạn nhập tìm kiếm khác")
  })

  controller.hears('Kết thúc', 'message_received', function (bot, message) {
    bot.startConversation(message, function (err, convo) {
      convo.say('Chúc bạn một ngày vui vẻ :)');
      convo.say('Nếu bạn có nhu cầu có thể tiếp tục hỏi');
    });
  })
  function addAspectsVer2(oldAspect, aspects) {
      let tags = [];
      tags.push(aspects);
      tags = getCurrentAspects(tags);
      let newQuery = oldAspect.concat(tags);
      return newQuery;
  }
  function replaceAspects(oldAspect,good,bad){
    for(var index = 0;index<oldAspect.length;index++){
    	if((oldAspect[index].content == bad.content) 
    		&& (oldAspect[index].type == bad.type)){
    		oldAspect[index] = good
    	}
    }
	return oldAspect;

  }
  function custom_hear_middleware(patterns, message) {
  	let userId = message.user;
  	if(message.text == 'Đi đến tư vấn tiếp theo'){
  		user=message.user;
  		if(history[user].currRe < history[user].recom.length){
  			history[user].currRe = history[user].currRe + 1;
  		}
  		console.log(history[user].currRe)
  		message.text = 'Bắt đầu tư vấn'
  	}
  	else if(message.text == 'Tư vấn lại từ đầu'){
  		user=message.user;
  		history[user].currRe = 0;
  		message.text = 'Bắt đầu tư vấn'
  	}
  	else if(typeof history[userId] !== 'undefined'){
		if('recom' in history[userId]){
			if(history[userId].recom && history[userId].recom.length){
			let currentRecom = history[userId].currRe;
			let recom = history[userId].recom[currentRecom];
			let recomTags = history[userId].recomTags[currentRecom];
		  	for(var i = 0;i<recom.length;i++){
			    if (message.text == recom[i]) {
			    	message.text = {
			    		content:recom[i], type:recomTags
			    	}
			        return true;
			    }
			}
		}
		}
		else{
			return false;
		}
	}
	else{
		return false;
	}
}
  controller.hears('Thêm recomendation', 'message_received', custom_hear_middleware ,function (bot, message) {
  	bot.startConversation(message, function (err, convo) {
        let user = message.user
        let temp = message.text
        history[user].addRe = temp
        convo.say({
		            text: `Bạn có muốn thêm tư vấn vào tìm kiếm?`,
		            quick_replies: [
		              {
		                title: 'CÓ',
		                payload: 'Thêm tư vấn vào'
		              },
		              {
		                title: 'KHÔNG',
		                payload: 'Tư vấn lại từ đầu'
		              },
		            ],
		        });
        
  	});
  })
  function replace_hear_middleware(patterns,message){
  	let userId = message.user;
  	if(message.text == 'Bắt đầu tư vấn'){
  		return false;
  	}
  	else if(typeof history[userId] !== 'undefined'){
		if('recom' in history[userId]){
			if(history[userId].recom && history[userId].recom.length){
			let currentRecom = history[userId].currRe;
			let recom = history[userId].recom[currentRecom];
			let recomTags = history[userId].recomTags[currentRecom];
		  	for(var i = 0;i<recom.length;i++){
			    if (message.text == 'Thay thế '+recom[i]) {
			    	message.text = {
			    		content:recom[i], type:recomTags
			    	}
			        return true;
			    }
			}
		}
		}
		else{
			return false;
		}
	}
	else{
		return false;
	}
  }
  controller.hears('Replace recomendation', 'message_received', replace_hear_middleware ,function (bot, message) {
  	bot.startConversation(message, function (err, convo) {
        let user = message.user
        let temp = message.text
        history[user].addRe = temp
        convo.say({
		            text: `Bạn có muốn thay thế tư vấn vào tìm kiếm?`,
		            quick_replies: [
		              {
		                title: 'CÓ',
		                payload: 'Thay thế tư vấn'
		              },
		              {
		                title: 'KHÔNG',
		                payload: 'Tư vấn lại từ đầu'
		              },
		            ],
		        });
        
  	});
  })
  controller.hears('Thêm tư vấn vào', 'message_received',function(bot,message){
  	user = message.user
  	let temp = history[user].addRe;
  	let oldQuery = history[user].query;
    let currentAspects = getCurrentAspects(oldQuery)
    let result = addAspectsVer2(oldQuery,temp)
    result = getCurrentAspects(result)
    history[user].query = result
	search(bot,result,false,message)
  })
  controller.hears('Thay thế tư vấn','message_received',function(bot,message){
  	user = message.user
  	let temp = history[user].addRe;
  	let currRe = history[user].currRe;
  	let bad = history[user].badAspect[currRe];
  	let oldQuery = history[user].query;
  	console.log(bad)
    //let currentAspects = getCurrentAspects(oldQuery)
    let result = replaceAspects(oldQuery,temp,bad)
    result = getCurrentAspects(result)
    console.log(result)
    history[user].query = result
	search(bot,result,false,message)
  })

  controller.hears('Bắt đầu tư vấn', 'message_received', async (bot, message) => {
  		user = message.user;
  		let data = await recomApi(user)
  		data = data.data
  		recom = []
  		tags = []
  		if(data['bad_aspect']){
  			bad_aspect = data['bad_aspect'];
  			bad_aspectlen = bad_aspect.length
  		}
  		else
  			bad_aspectlen = 0
  		bad_as = []
  		// var bad_aspectle = bad_aspect.length
  		for(var key in data){
  			if(key == 'bad_aspect'){}
  			else{
		        var attrName = key;
		       	var attrValue = data[key];
		       	var bool = true;
		       	var replace = false;
		       	for (var key=0;key<bad_aspectlen;key++){
		       		if(bad_aspect[key].type == attrName){
		       			for(var val=0;val<attrValue.length;val++){
							if(attrValue[val] == bad_aspect[key].content){
								bool = false;
							}
						}
						replace = true;
						replacer = bad_aspect[key];
		       		}
		       	}
		       	
		       	if(replace && bool){
		       		recom.push(attrValue);
			    	tags.push(attrName);
			    	bad_as.push(replacer);
		       	}
		       	if(!replace && bool){
		       		recom.push(attrValue);
			    	tags.push(attrName);
			    	bad_as.push('none');
		       	}
			}
		}
		if('recom' in history[user]){
			temprecom = history[user].recom
			if(!(compare(temprecom,recom))){
				history[user].recom = recom;
				history[user].currRe = 0;
				history[user].recomTags = tags;
				history[user].badAspect = bad_as;
			}
		}
		else{
			history[user].recom = recom;
			history[user].currRe = 0;
			history[user].recomTags = tags;
			history[user].badAspect = bad_as;
		}
		bot.startConversation(message,function (err, convo) {
	    if(typeof history[user].recom != 'undefined' && history[user].recom.length > 0){
	    	let currentRecom = history[user].currRe
	    	let attrValue = history[user].recom
	    	let attrName = history[user].recomTags
	    	let badAspect = history[user].badAspect
	    	if(currentRecom < attrName.length){
		    	let question = getQuesion(attrName[currentRecom],attrValue[currentRecom],badAspect[currentRecom]);
		    	convo.say(question)
		    }
		    else{
		    	history[user].currRe = history[user].currRe - 1;
		    	convo.say('Mình đã hết thông tin tư vấn để tư vấn cho bạn')
		    	convo.say({
		            text: 'Bạn có muốn xem thêm kết quả của tìm kiếm trước không?',
		            quick_replies: [
		              {
		                title: 'CÓ',
		                payload: 'Xem thêm kết quả'
		              },
		              {
		                title: 'KHÔNG',
		                payload: 'Ngừng xem kết quả'
		              },
		              {
		              	title: 'Tư vấn lại',
		              	payload:'Tư vấn lại từ đầu'
		              }
		            ],
		        });
		    }
	    }
	    else{
	    	let test = {
	            text: 'Bạn có muốn xem thêm kết quả của tìm kiếm trước không?',
	            quick_replies: [
	              {
	                title: 'CÓ',
	                payload: 'Xem thêm kết quả'
	              },
	              {
	                title: 'KHÔNG',
	                payload: 'Ngừng xem kết quả'
	              }
	            ],
	        };
	    	convo.say('Mình không có gì để tư vấn cho bạn')
	    	convo.say(test)
	    }
  	});
  })

  controller.on('hello', hello);
  controller.on('welcome_back', hello);
  controller.on('message_received', search);

}
