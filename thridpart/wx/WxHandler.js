const axios = require('axios');
const wxHost = 'https://open.weixin.qq.com/connect/oauth2';
const accessHost = 'https://api.weixin.qq.com/sns/oauth2'
const userInfoUrl = 'https://api.weixin.qq.com/sns/userinfo';
class WxHandler{

    constructor(appID,appSerect){
        this.appID = appID;
        this.appSerect = appSerect;
    }

    authUrl(host,redirectUrl){
        return `${wxHost}/authorize?appid=${this.appID}&redirect_uri=` +
            (`${host}${redirectUrl}`)+`&response_type=code&scope=snsapi_userinfo&state=STATE#wechat_redirect`;
    }

    async wxAuth(code) {
        //通过拿到的code和appID、app_serect获取返回信息
        //解析得到access_token和open_id
        var {access_token,openid} = await this.getAccessToken(code);
        console.log('access_token,openid',access_token,openid)
        //通过上一步获取的access_token和open_id获取userInfo即用户信息
        return await this.getUserInfo(access_token, openid);
    }

    //通过拿到的code和appID、app_serect获取access_token和open_id
    async getAccessToken(code) {
        console.log('wx code',code);
        var getAccessUrl = `${accessHost}/access_token?appid=` +
            `${this.appID}&secret=${this.appSerect}&code=${code}&grant_type=authorization_code`;
        var {data} = await axios.get(getAccessUrl);
        return data;
    }

    //通过上一步获取的access_token和open_id获取userInfo即用户信息
    async getUserInfo(access_token, open_id) {
        var getUserUrl = `${userInfoUrl}?access_token=${access_token}&openid=${open_id}&lang=zh_CN`;
        var {data} = await axios.get(getUserUrl);
        return data;
    }
}

module.exports = WxHandler;