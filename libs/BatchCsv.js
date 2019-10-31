/**
 * Created by devilroshan on 2017/6/27.
 */
// const json2csv = require('json2csv');
const Iconv = require('iconv-lite')

const beginBatchCsv = async (req, res, fileName) => {
    let userAgent = (req.headers['user-agent']||'').toLowerCase();
    // res.set('Content-Type', 'application/octet-stream;charset=utf-8');

    if(userAgent.indexOf('msie') >= 0 || userAgent.indexOf('chrome') >= 0) {
        res.setHeader('Content-Disposition', 'attachment; filename=' + encodeURIComponent(fileName) + '.csv');
    } else if(userAgent.indexOf('firefox') >= 0) {
        res.setHeader('Content-Disposition', 'attachment; filename*="utf8\'\'' + encodeURIComponent(fileName) + '.csv');
    } else {
        res.setHeader('Content-Disposition', 'attachment; filename=' + new Buffer(fileName).toString('binary') + '.csv');
    }
    // await res.setHeader('Content-disposition', `attachment; filename=`+URLEncoder.encode(fileName, "utf-8")+'.csv')、
    await res.writeHead(200, {'Content-Type': 'text/csv;charset=utf-8'})
}

const writeBatchCsv = async (res, data, fields, fieldNames, flag, changeColArr, isArray) => {
    if(data.length === 0) {
        let obj = {}
        fields.forEach(v=>obj[v]=' ')
        data.push(obj)
    }
    // let csv = json2csv({ data: data, fields: fields, fieldNames:fieldNames, del:',\t', quotes:''})
    // let lastItem = fieldNames[fieldNames.length-1]
    // flag && (csv = csv.substr((csv.indexOf(lastItem)+lastItem.length+1),csv.length))
    // let length =
    let csv = '';
    (!flag) && fieldNames.forEach((v,i)=>{
        csv+=`${v},`;
        ((fieldNames.length-1)===i)&&(csv+='\n');
    });
    for(let i = 0; i<data.length; i++){
        let row = data[i]
        // console.log('fields=====',fields)
        fields.forEach(v=>{
            csv += `${row[v]}`
            // console.log('changeColArr=======',changeColArr)
            changeColArr.length && changeColArr.forEach(field=>v===field && (csv += `\t`))
            csv += `,`
        });
        (i !== data.length-1) && (csv += '\n')
    }
    (!flag || isArray) && (csv = Buffer.concat([new Buffer('\xEF\xBB\xBF', 'binary'), new Buffer(csv)]))
    csv = Iconv.encode(csv,'utf-8')
    // console.log(csv)
    await res.write(csv)
    await res.write('\n')
}


/**
 *  csv对象生成函数
 *  keys [...]
 *  values 生成一个对象[...]或者生成多个对象[[...],[...]]
 *  keys,values或者value中单独个数组，必须一一对应，长度相同
 *  要求每个对象属性只能为string 类型
 */
const csvObjCreateProperties = (keys,values) => {
    //判断生成数组数量，通过values的类型
    let objFlag = false
    if(!(values[0] && values[0] instanceof Array)){
        objFlag = true
        values = [values]
    }
    let result = []
    values.forEach(v=>{
        let obj = {}
        keys.length === v.length && v.forEach((v,index)=>{obj[keys[index]] = v})
        result.push(obj)
    })
    result = objFlag ? result[0] : result
    return result
}

module.exports = {
    beginBatchCsv,
    writeBatchCsv,
    csvObjCreateProperties
}