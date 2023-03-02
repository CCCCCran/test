<template>
  <layout>
    <router-view v-slot="{ Component, route }">
        <!-- 使用缓存 -->
      <keep-alive>
        <component :is="Component" :key="route.fullPath" v-if="route.meta.keepAlive" />
      </keep-alive>
      <!-- 不使用缓存 -->
      <component :is="Component" :key="route.fullPath" v-if="!route.meta.keepAlive" />
    </router-view>
  </layout>
</template>

<script lang="ts" setup>
import { useStore } from 'vuex';
import layout from '@/layout/index.vue';
import getGlobal from "@/utils/global";
import connectAuth from '@/utils/connectAuth';
import cookieConfig from '@/utils/cookieConfig';

const store = useStore();
const global = getGlobal();
// connectAuth.againLogin();

// 监听认证中心 tokne 变化
const authToken = (token:{[k:string]:any}) => {
  if (global.$common.isEmpty(token)) {
    connectAuth.goToLogin();
    return;
  }
  const accessCookie = global.$common.getCookie(cookieConfig.tokenName) as string;
  const userInfo = store.getters['layout/userInfo'];
  // if (global.$common.isEmpty(accessCookie)) return;
  const newCookie = `${token.token_type} ${token.access_token}`;
  // 关闭重新登录弹窗
  connectAuth.removeModal();
  // 当 token 不一致时, 获取登录账号
  if (accessCookie !== newCookie) {
    global.$common.setCookie([
      {key: cookieConfig.tokenName, value: newCookie}
    ]);
    const awaitList = [
      { dataOrigin: connectAuth.getUserInfo(), key: 'userInfo'},
      // { dataOrigin: connectAuth.getPermissions(), key: 'permissionsIds'},
      // { dataOrigin: connectAuth.getSysMenu(), key: 'menuTree'}
    ];
    connectAuth.customGetInfo(awaitList).then(info => {
      // 登录账号不一致时刷新页面
      if (!global.$common.isEmpty(info.userInfo) && userInfo.username !== info.userInfo.username) {
        // window.location.replace(window.location.href.split('#/')[0]);
        window.location.reload();
      }
    });
  }
}
// 监听登录 token 是否改变
global.$bus.on('auth-token', authToken);
</script>
