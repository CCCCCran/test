import axios from 'axios';
import { ElMessage } from 'element-plus'
import common from '@/utils/common';
import bus from '@/utils/bus';
import requestHand from './requestHand'
import NProgress from 'nprogress';
import 'nprogress/nprogress.css';
import cookieConfig from '@/utils/cookieConfig';
import connectAuth from '@/utils/connectAuth';
import qs from "qs";
import type { AxiosRequestConfig } from 'axios';

const resultExceedTime = 1000 * 0.5; // 单位: 毫秒
const pendingList = new Map();
let resultList:{[k:string]:any} = {};

const isFormData = (data:any) => {
  if (common.isEmpty(data)) return false;
  return Object.prototype.toString.call(data) === '[object FormData]';
}
const getrequestKey = (config:AxiosRequestConfig) => {
  let newParams:{[key:string]:any} = {};
  let newData:{[key:string]:any} = {};
  if (config) {
    if (common.isString(config.params) && !isFormData(config.params)) {
      try {
        newParams = JSON.parse(config.params || '{}');
      } catch (e) {
        newParams = { keyParams: config.params }
      }
    } else {
      newParams = config.params;
    }
    if (common.isString(config.data) && !isFormData(config.data)) {
      try {
        newData = JSON.parse(config.data || '{}');
      } catch (e) {
        newData = { keyData: config.data }
      }
    } else {
      newData = config.data;
    }
  }
  if (isFormData(newParams)) {
    let obj = {};
    newParams.forEach((item:any, key:string) => {
      obj[key] = common.isFile(item) ? {
        lastModified: item.lastModified,
        name: item.name,
        size: item.size,
        type: item.type,
      } : item;
    })
    newParams = obj;
  }
  if (isFormData(newData)) {
    let obj = {};
    newData.forEach((item:any, key:string) => {
      obj[key] = common.isFile(item) ? {
        lastModified: item.lastModified,
        name: item.name,
        size: item.size,
        type: item.type,
      } : item;
    })
    newData = obj;
  }
  // 排序, 将参数一样顺序不一样的情况处理成一样
  const params = qs.stringify(newParams, {
    sort: (a: string, b: string) => {
      return a.localeCompare(b);
    }
  });
  const dataParams = qs.stringify(newData, {
    sort: (a: string, b: string) => {
      return a.localeCompare(b);
    }
  });
  const responseType = config ? config.responseType || '' : '';
  return [(config ? config.method || '' : ''), responseType, (config ? config.url || '' : ''), params, dataParams].join('&');
}

// 移除请求
const removePending = (requestKey:string, isRemove?:boolean) => {
  // 如果在 pending 中存在当前请求标识，取消当前请求，并且移除
  if (pendingList.has(requestKey)) {
    if (!isRemove) {
      pendingList.delete(requestKey);
      delete resultList[requestKey];
    } else {
      setTimeout(() => {
        pendingList.delete(requestKey);
        delete resultList[requestKey];
      }, 20);
    }
  }
}

// 添加请求
const addPending = (config:AxiosRequestConfig) => {
  const requestKey = getrequestKey(config);
  if (pendingList.has(requestKey)) {
    const thisTime = new Date().getTime();
    if (resultList[requestKey]) {
      const isReject:boolean = resultList[requestKey].status === 'reject' || resultList[requestKey].remove;
      const requestCacheTime = (resultList[requestKey].resultTime || 0) + (config.cacheTime || resultExceedTime);
      // 过期或异常的移除缓存
      if (thisTime - requestCacheTime > 0 || isReject) {
        removePending(requestKey, isReject);
        // 移除之后再次添加进来
        config.cancelToken = config.cancelToken || new axios.CancelToken(cancel => {
          pendingList.set(requestKey, cancel);
        })
        return;
      }
    }
    // 如果 pending 中存在当前请求则取消后面的请求
    config.cancelToken = new axios.CancelToken(cancel => {
      return cancel(requestKey);
    });
    return;
  }
  // 如果 pending 中不存在当前请求，则添加进去
  config.cancelToken = config.cancelToken || new axios.CancelToken(cancel => {
    pendingList.set(requestKey, cancel);
  })
}

// axios 默认配置
const instance = axios.create({
  headers: {
    withCredentials: true,
    'Accept-Language': 'zh-CN'
  }
});

// axios 其他自定义配置
instance.interceptors.request.use((config) => {
  //配置发送请求的信息
  NProgress.start();
  const requestConfig = () => {
    let headersConfig:any = {};
    const token = common.getCookie(cookieConfig.tokenName);
    if (!common.isEmpty(token)) {
      headersConfig.Authorization = `${token}`;
    }
    config.headers = {...headersConfig, ...config.headers};
    config.baseURL = requestHand.baseHand(config.url);
    config.timeout = common.isNumber(config.timeout) && config.timeout > 1000 ? config.timeout : 1000 * 120;
    // 移除参数中的空值
    if(common.isEmpty(config.removeEmpty) || (common.isBoolean(config.removeEmpty) && config.removeEmpty)) {
      // 当非 FormData 或 默认提交时对参数处理
      if (!isFormData(config.data)) {
        config.data = !common.isEmpty(config.data) ? common.removeEmpty(config.data) : undefined;
      }
      if (!isFormData(config.params)) {
        config.params = !common.isEmpty(config.params) ? common.removeEmpty(config.params) : undefined;
      }
    }
    // 当下载文件时
    if ((common.isBoolean(config.downLoadFile) && config.downLoadFile) || (common.isBoolean(config.isFile) && config.isFile)) {
      config.responseType = 'blob';
    }
    // 缓存请求值
    if (!common.isBoolean(config.isCache) || config.isCache) {
      addPending(config);
    }
    return config;
  }
  return new Promise((resolve, reject) => {
    bus.authReadyComplete().then(() => {
      // 需要加载的信息
      const awaitList = [
        { dataOrigin: connectAuth.getToken(), key: 'token'}
      ];
      connectAuth.customGetInfo(awaitList).then(info => {
        // 当认证中心不存在token时，跳转登录
        if (common.isEmpty(info.token)) {
          connectAuth.goToLogin();
          return;
        }
        resolve(requestConfig());
      })
    })
  })
});

// 添加响应拦截器
instance.interceptors.response.use((response) => {
  return new Promise((resolve, reject) => {
    const config = response.config;
    const requestKey = getrequestKey(config);
    NProgress.done();
    const responseData = response.data || {};
    const code = responseData.status || responseData.code || response.status;
    let newMsg = responseData.msg;
    // 状态码处理
    if (!common.isEmpty(requestHand.hand[code])) {
      if ((common.isBoolean(config.downLoadFile) && config.downLoadFile) || (common.isBoolean(config.isFile) && config.isFile)) {
        resultList[requestKey] = {
          resultTime: new Date().getTime(),
          result: response,
          downLoadFile: true
        };
        return resolve(requestHand.downLoadFile(response));
      }
      requestHand.hand[code](response).then((res:any) => {
        resultList[requestKey] = { resultTime: new Date().getTime(), result: res.data || {}};
        resolve(res.data || {});
      }).catch((err:any) => {
        const newErr = err.response && err.response.data ? err.response.data : err.data || err;
        resultList[requestKey] = { resultTime: new Date().getTime(), status: 'reject', result: newErr };
        reject(newErr);
      });
      return;
    }
    // 错误处理
    if(common.isEmpty(newMsg)) {
      if (requestHand.tipsTxt[code]) {
        newMsg = common.isFunction(requestHand.tipsTxt[code]) ?
        requestHand.tipsTxt[code](response, response.data) : requestHand.tipsTxt[code];
      } else {
        newMsg = requestHand.other.unknown;
      }
    }
    !config.hiddenError && ElMessage({
      message: newMsg,
      duration: 3000,
      showClose: true,
      type: 'error'
    });
    console.error(response);
    resultList[requestKey] = { resultTime: new Date().getTime(), status: 'reject', result: responseData};
    return reject(responseData);
  })
}, (error) => {
  return new Promise((resolve, reject) => {
    const config = error.config;
    const requestKey = getrequestKey(config);
    NProgress.done();
    if (error.response) {
      const responseData = error.response.data || {};
      const code = responseData.status || responseData.code || error.response.status;
      let newMsg = responseData.msg;
      // 状态码处理
      if (!common.isEmpty(requestHand.hand[code])) {
        requestHand.hand[code](error.response, responseData).then((res:any) => {
          if ((common.isBoolean(config.downLoadFile) && config.downLoadFile) || (common.isBoolean(config.isFile) && config.isFile)) {
            resultList[requestKey] = {
              resultTime: new Date().getTime(),
              result: res,
              downLoadFile: true
            };
            return resolve(requestHand.downLoadFile(res));
          }
          resultList[requestKey] = { resultTime: new Date().getTime(), result: res.data || {}};
          return resolve(res.data || {});
        }).catch((err:any) => {
          const newErr = err.response && err.response.data ? err.response.data : err.data || err;
          resultList[requestKey] = { resultTime: new Date().getTime(), status: 'reject', result: newErr};
          reject(newErr);
        });
        return;
      }
      // 错误处理
      if(common.isEmpty(newMsg)) {
        if (requestHand.tipsTxt[code]) {
          newMsg = common.isFunction(requestHand.tipsTxt[code]) ?
          requestHand.tipsTxt[code](error.response, error.response.data) : requestHand.tipsTxt[code];
        } else {
          newMsg = requestHand.other.unknown;
        }
      }
      !config.hiddenError && ElMessage({
        message: newMsg || '未知错误，请检查网络是否可用或联系管理员!',
        duration: 3000,
        showClose: true,
        type: 'error'
      });
      console.error(error.response);
      resultList[requestKey] = { resultTime: new Date().getTime(), status: 'reject', result: responseData};
      return reject(responseData);
    }
    if (error.message && pendingList.has(error.message) && common.isEmpty(config)) {
      // 使用定时器获取接口返回值
      const thisRequest = setInterval(() => {
        if (!pendingList.has(error.message)) {
          clearInterval(thisRequest);
          removePending(error.message, true);
          return reject(error);
        }
        if (!common.isEmpty(resultList[error.message])) {
          clearInterval(thisRequest);
          const resultObj = resultList[error.message];
          if (!['reject'].includes(resultObj.status)) {
            resultObj.downLoadFile ? resolve(requestHand.downLoadFile(resultObj.result)) : resolve(resultObj.result);
          } else {
            reject(resultObj.result);
          }
        }
      }, 10)
      return;
    }
    config && !config.hiddenError && ElMessage({
      message: '未知错误，请检查网络是否可用或联系管理员!',
      duration: 3000,
      showClose: true,
      type: 'error'
    });
    console.error(JSON.parse(JSON.stringify(error)));
    resultList[requestKey] = { resultTime: new Date().getTime(), status: 'reject', result: error};
    return reject(error);
  })
});
export default instance;
