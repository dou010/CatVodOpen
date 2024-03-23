import * as HLS from 'hls-parser';
import req from '../../util/req.js';

//let url = 'https://cj.ffzyapi.com/api.php/provide/vod/from/ffm3u8/';
let srcobj = {};

async function request(reqUrl) {
    let res = await req(reqUrl, {
        method: 'get',
    });
    return res.data;
}

async function init(inReq, _outResp) {
    srcobj = inReq.server.config.vcm3u8;
    return {};
}

async function home(_inReq, _outResp) {
    let classes = [];        

    /* json obj arrary 取key名及值的方法
    for (let i = 0; i < Object.keys(srcobj).length; i++) {
        classes.push({
            type_id: Object.keys(srcobj)[i],
            type_name: Object.values(srcobj)[i][0].name,
        });
    }
    
    classes = Object.keys(srcobj).map(function(key) {
        return {
          type_id: key,
          type_name: srcobj[key][0].name,
        };
      });
    */

    classes = Object.keys(srcobj).map(key => ({
        type_id: key,
        type_name: srcobj[key][0].name,
    }));

    //第三种,写在home里,理论上可行,但会一口气全发所有配置,配置1站就发1,100就发100,不建议
    /*
    let filterObj = {};
    for (let i = 0; i < Object.keys(srcobj).length; i++) {
        let urlsrc = Object.values(srcobj)[i][0].url;
        let categories = Object.values(srcobj)[i][0].categories;
        let data = null;
        try {
            data = await request(urlsrc);
        } catch (error) {
            continue;
        }
        if (data.length == 0) continue;
        let type = {
            key: 'category',
            name: '类型',
        };
        let filterAll = [];
        let typeValues = [];
        for (const cls of data.class) {
            const n = cls.type_name.toString().trim();
            if (categories && categories.length > 0) {
                if (categories.indexOf(n) < 0) continue;
            }
            typeValues.push({ n: n, v: cls.type_id.toString() });
        }
        if (categories && categories.length > 0) {
            typeValues = typeValues.sort((a, b) => {
                return categories.indexOf(a.n) - categories.indexOf(b.n);
            });
        }
        type['init'] = typeValues[0].v;
        type['value'] = typeValues;
        filterAll.push(type);
        filterObj[Object.keys(srcobj)[i]] = filterAll;
    }
    */

    return {
        class: classes,
        //第三种
        //filters: filterObj,
    };
}

async function category(inReq, _outResp) {
    const tid = inReq.body.id;
    let pg = inReq.body.page;
    let page = pg || 1;
    if (page == 0) page = 1;
    let videos = [];
    

    /*
    const extend = inReq.body.filters;
    let url = srcobj[tid][0].url;    
    let data = null;
    try {
        data = await request(url + `?ac=detail&t=${extend.category || ''}&pg=${page}`);
    } catch (error) {
        return {};
    }
    if (data.length == 0) return {};    
    //console.log('fpplog extend.category1: ' + extend.category);
    for (const vod of data.list) {
        videos.push({
            vod_id: tid.concat('=').concat(vod.vod_id.toString()),
            vod_name: vod.vod_name.toString(),
            vod_pic: vod.vod_pic,
            vod_remarks: vod.vod_remarks,
        });
    }
    //console.log('fpplog extend.url: ' + url);
    return {
        page: parseInt(data.page),
        pagecount: data.pagecount,
        total: data.total,
        list: videos,
    };
    */


    if (tid.includes('=')) {
        let url = srcobj[tid.split('=')[0]][0].url;
        let data = null;
        try {
            data = await request(url + `?ac=detail&t=${tid.split('=')[1]}&pg=${page}`);
        } catch (error) {
            return {};
        }
        if (data.length == 0) return {};  
        for (const vod of data.list) {
            videos.push({
                vod_id: tid.split('=')[0].concat('=').concat(vod.vod_id.toString()),
                vod_name: vod.vod_name.toString(),
                vod_pic: vod.vod_pic,
                vod_remarks: vod.vod_remarks,
            });
        }
        return {
            page: parseInt(data.page),
            pagecount: data.pagecount,
            total: data.total,
            list: videos,
        };
    } else {
        let url = srcobj[tid][0].url;
        let categories = srcobj[tid][0].categories;
        let data = null;
        try {
            data = await request(url);
        } catch (error) {
            return {};
        }
        if (data.length == 0) return {};  
        for (const cls of data.class) {
            const n = cls.type_name.toString().trim();
            if (categories && categories.length > 0) {
                if (categories.indexOf(n) < 0) continue;
            }
            videos.push({
                vod_id: tid.concat('=').concat(cls.type_id.toString()),
                vod_name: n,
                vod_pic : 'https://t.mwm.moe/ycy',
                vod_remarks: '',
                cate: {},
            });
        }
        if (categories && categories.length > 0) {
            videos = videos.sort((a, b) => {
                return categories.indexOf(a.vod_name) - categories.indexOf(b.vod_name);
            });
        }
        return {
            page: 1,
            pagecount: Math.ceil(videos.length / 30),
            limit: 30,
            total: videos.length,
            list: videos,                  
        };
    }
}

async function detail(inReq, _outResp) {
    const ids = !Array.isArray(inReq.body.id) ? [inReq.body.id] : inReq.body.id;
    const videos = [];
    for (const id of ids) {
        let data = null;
        try {
            data = (await request(id.includes('http') ? id : srcobj[id.split('=')[0]][0].url + `?ac=detail&ids=${id.split('=')[1]}`)).list[0];
        } catch (error) {
            continue;
        }
        if (data.length == 0) continue;
        let vod = {
            vod_id: data.vod_id,
            vod_name: data.vod_name,
            vod_pic: data.vod_pic,
            type_name: data.type_name,
            vod_year: data.vod_year,
            vod_area: data.vod_area,
            vod_remarks: data.vod_remarks,
            vod_actor: data.vod_actor,
            vod_director: data.vod_director,
            vod_content: data.vod_content.trim(),
            vod_play_from: srcobj.hasOwnProperty(data.vod_play_from) ? Object.values(srcobj[data.vod_play_from])[0].name : data.vod_play_from,
            vod_play_url: data.vod_play_url,
        };
        videos.push(vod);
    }
    return {
        list: videos,
    };
}

async function proxy(inReq, outResp) {
    const what = inReq.params.what;
    const purl = decodeURIComponent(inReq.params.ids);
    if (what == 'hls') {
        const resp = await req(purl, {
            method: 'get',
        });
        const plist = HLS.parse(resp.data);
        if (plist.variants) {
            for (const v of plist.variants) {
                if (!v.uri.startsWith('http')) {
                    v.uri = new URL(v.uri, purl).toString();
                }
            }
            plist.variants.map((variant) => {
                variant.uri = inReq.server.prefix + '/proxy/hls/' + encodeURIComponent(variant.uri) + '/.m3u8';
            });
        }
        if (plist.segments) {
            for (const s of plist.segments) {
                if (!s.uri.startsWith('http')) {
                    s.uri = new URL(s.uri, purl).toString();
                }
                if (s.key && s.key.uri && !s.key.uri.startsWith('http')) {
                    s.key.uri = new URL(s.key.uri, purl).toString();
                }
            }
            plist.segments.map((seg) => {
                seg.uri = inReq.server.prefix + '/proxy/ts/' + encodeURIComponent(seg.uri) + '/.ts';
            });
        }
        const hls = HLS.stringify(plist);
        let hlsHeaders = {};
        if (resp.headers['content-length']) {
            Object.assign(hlsHeaders, resp.headers, { 'content-length': hls.length.toString() });
        } else {
            Object.assign(hlsHeaders, resp.headers);
        }
        delete hlsHeaders['transfer-encoding'];
        delete hlsHeaders['cache-control'];
        if (hlsHeaders['content-encoding'] == 'gzip') {
            delete hlsHeaders['content-encoding'];
        }
        outResp.code(resp.status).headers(hlsHeaders);
        return hls;
    } else {
        outResp.redirect(purl);
        return;
    }
}

async function play(inReq, _outResp) {
    const id = inReq.body.id;
    return {
        parse: 0,
        url: inReq.server.address().dynamic + inReq.server.prefix + '/proxy/hls/' + encodeURIComponent(id) + '/.m3u8',
    };
}

async function search(inReq, _outResp) {
    const wd = inReq.body.wd;
    let videos = [];
    for (let i = 0; i < Object.keys(srcobj).length; i++) {
        if (!Object.values(srcobj)[i][0].search) continue;
        let data = null;
        try {
            data = await request(Object.values(srcobj)[i][0].url + `?ac=detail&wd=${wd}`);
        } catch (error) {
            continue;
        }
        if (data.length == 0) continue;
        for (const vod of data.list) {
            if (!vod.vod_name.toString().includes(wd)) continue;
            videos.push({
                vod_id: Object.values(srcobj)[i][0].url.concat('?ac=detail&ids=').concat(vod.vod_id.toString()),
                vod_name: vod.vod_name.toString(),
                vod_pic: vod.vod_pic,
                //vod_remarks: vod.vod_remarks,
                vod_remarks: Object.values(srcobj)[i][0].name,
            });
        }
    }
    return {
        page: 1,
        pagecount: Math.ceil(videos.length / 30),
        limit: 30,
        total: videos.length,
        list: videos,
    };
}

async function test(inReq, outResp) {
    try {
        const printErr = function (json) {
            if (json.statusCode && json.statusCode == 500) {
                console.error(json);
            }
        };
        const prefix = inReq.server.prefix;
        const dataResult = {};
        let resp = await inReq.server.inject().post(`${prefix}/init`);
        dataResult.init = resp.json();
        printErr(resp.json());
        resp = await inReq.server.inject().post(`${prefix}/home`);
        dataResult.home = resp.json();
        printErr(resp.json());
        if (dataResult.home.class.length > 0) {
            resp = await inReq.server.inject().post(`${prefix}/category`).payload({
                id: dataResult.home.class[0].type_id,
                //id: 'ffm3u8/13',
                page: 1,
                filter: true,
                filters: {},
            });
            dataResult.category = resp.json();
            printErr(resp.json());
            if (dataResult.category.list.length > 0) {
                resp = await inReq.server.inject().post(`${prefix}/detail`).payload({
                    id: dataResult.category.list[0].vod_id, // dataResult.category.list.map((v) => v.vod_id),
                    //id: 'https://subocaiji.com/api.php/provide/vod/from/subm3u8/?ac=detail&ids=55606',
                });
                dataResult.detail = resp.json();
                printErr(resp.json());
                if (dataResult.detail.list && dataResult.detail.list.length > 0) {
                    dataResult.play = [];
                    for (const vod of dataResult.detail.list) {
                        const flags = vod.vod_play_from.split('$$$');
                        const ids = vod.vod_play_url.split('$$$');
                        for (let j = 0; j < flags.length; j++) {
                            const flag = flags[j];
                            const urls = ids[j].split('#');
                            for (let i = 0; i < urls.length && i < 2; i++) {
                                resp = await inReq.server
                                    .inject()
                                    .post(`${prefix}/play`)
                                    .payload({
                                        flag: flag,
                                        id: urls[i].split('$')[1],
                                    });
                                dataResult.play.push(resp.json());
                            }
                        }
                    }
                }
            }
        }
        resp = await inReq.server.inject().post(`${prefix}/search`).payload({
            wd: '爱',
            page: 1,
        });
        dataResult.search = resp.json();
        printErr(resp.json());
        return dataResult;
    } catch (err) {
        console.error(err);
        outResp.code(500);
        return { err: err.message, tip: 'check debug console output' };
    }
}

export default {
    meta: {
        key: 'vcm3u8',
        name: '🍀 采集合集',
        type: 3,
    },
    api: async (fastify) => {
        fastify.post('/init', init);
        fastify.post('/home', home);
        fastify.post('/category', category);
        fastify.post('/detail', detail);
        fastify.post('/play', play);
        fastify.post('/search', search);
        fastify.get('/proxy/:what/:ids/:end', proxy);
        fastify.get('/test', test);
    },
};