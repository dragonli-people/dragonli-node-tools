/**
 * Created by freeangel on 17/2/16.
 */

var http = require('http');
var qs = require('querystring');
var requestNum = 0;
var responseNum = 0;

var logArr = [];

global.httpRequestLog = logArr


function run() {

	logArr.unshift(`===request:${requestNum}==response:${responseNum}`)
    requestNum = responseNum = 0;
    logArr.length = Math.min(3000,logArr.length)
	// if(logArr.length>500)
	// 	logArr.
}
setInterval(run,5000)

module.exports = function(url,data,host,port,method,timeout)
{
	//获取超时时间
	var timeout_limit= timeout !== undefined ? timeout : parseInt(process.env.HOST_TEST.split(',')[2])*1000;
	method = method || 'POST'
	var timerId = 0;
	var end = false;
	console.info('===request info=',host,port,url,method)
	return new Promise(function (resolve, reject) {
		var postData = JSON.stringify(data)
		var options = {
			hostname: host,
			port: port,
			path: url,
			//method: 'GET',
			method: method,
			headers: {
				//'Content-Type':'application/x-www-form-urlencoded',
				'Content-Type': 'application/json',
				'Content-Length': Buffer.byteLength(postData)
			}
		}
		var responseDateStr = ''
		var req = http.request(options, function (res) {
			// console.log('Status:', res.statusCode);
			// console.log('headers:', JSON.stringify(res.headers));
			res.setEncoding('utf-8');
			res.on('data', function (chun) {
				//console.log('body分隔线---------------------------------\r\n');
				//console.info(chun);
				responseDateStr += chun
			});
			res.on('end', function () {
				if(end)
					return
				// console.log('No more data in response.********',typeof responseDateStr,responseDateStr);
				// var data = JSON.parse(responseDateStr)
				// console.log(data)
                responseNum++;
				clearTimeout(timerId)
				try
				{
                    resolve(JSON.parse(responseDateStr))
				}catch (e){  resolve({status:-1,timeout:false,exception:true,errType:1,responseDateStr:responseDateStr}) }
			});
		});
		req.on('error', function (err) {
			//console.error(err);
			reject({err:err,exception:true,errType:2})
		});
		//console.info('=====request data==========',postData)
        requestNum++
		timeout_limit > 0 && ( timerId = setTimeout(()=>(end=true)&&resolve({status:-1,timeout:true,exception:true,errType:3}),timeout_limit) )
		req.write(postData);
		req.end();
	})
}