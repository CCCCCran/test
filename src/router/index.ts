import { createRouter, createWebHashHistory } from "vue-router";
import NProgress from "nprogress";
import pageRouter from "./pageRouter";
import common from '@/utils/common';
import bus from '@/utils/bus';
import connectAuth from "@/utils/connectAuth";
import "nprogress/nprogress.css";
import store from "@/store";
// import cookieConfig from "@/utils/cookieConfig";

const tool = {
  // 获取所有路由地址
  getRoutersPath: (arr:any, newRoute:Array<string | number> = []) => {
    arr.forEach((item:any) => {
      newRoute.push(item.path);
      !common.isEmpty(item.children) && tool.getRoutersPath(item.children, newRoute)
    })
    return newRoute;
  },
  // 获取菜单所有 path
  getTreePath: (arr:any, treePath:Array<string | number> = [], allItem:Array<string | number> = []) => {
    arr.forEach((item:any) => {
      !common.isEmpty(item.url || item.path) && treePath.push(item.url || item.path);
      allItem.push(item);
      if (!common.isEmpty(item.childList)) {
        tool.getTreePath(item.childList, treePath, allItem)
      } else if (!common.isEmpty(item.children)) {
        tool.getTreePath(item.children, treePath, allItem)
      }
    })
    return { treePath: treePath, allItem: allItem };
  },
  // 设置页面标题
  setTitle: (treeLsit:Array<string | number> = [], to:any = {}) => {
    const newItem:any = treeLsit.find((item:any) => {
      return item.url === to.path || item.path === to.path
    })
    // 优先使用菜单名称为标题
    if (!common.isEmpty(newItem) && !!newItem.name) {
      document.title = `LAPA-${newItem.name}`;
      return;
    }
    // 当不存在标题使用路由标题
    if (to.name) {
      document.title = `LAPA-${(to.params.type && to.meta.title && common.isObject(to.meta.title))?to.meta.title[to.params.type] || '' : to.name}`;
    } else {
      document.title = 'LAPA 系统';
    }
  },
  routeNext: (routePath:any, to:any, next:any) => {
    const navList = store.getters['layout/menuTree'] || [];
    const treeJson = tool.getTreePath(navList);
    // 设置标题
    tool.setTitle(treeJson.allItem, to);
    store.commit('layout/nonExist', false);
    store.commit('layout/noAccess', routePath.includes(to.path) && (!treeJson.treePath.includes(to.path) || !treeJson.treePath[0]));
    next();
  },
  routerValidation: (menuTree:any, routePath:any, to:any, next:any) => {
    // 验证 token 是否有效
    connectAuth.validationToken().then(validation => {
      if (!validation) {
        store.commit('routerModel/routerLoading', false);
        NProgress.done();
        connectAuth.goToLogin();
        return;
      }
        // 当菜单为空时，请求接口获取菜单
      (common.isEmpty(menuTree) || menuTree.length === 0) ? connectAuth.getSysMenu().then(res => {
        tool.routeNext(routePath, to, next);
      }) : tool.routeNext(routePath, to, next);
    })
  }
}

const router = createRouter({
  /* 
    history 配置： createWebHashHistory 使用 hash 模式， createWebHistory html5 历史模式, 
    均需在 import vue-router 时定义方法名称
  */
  history: createWebHashHistory(), // 使用 hash 模式
  routes: [
    {
      name: "首页",
      path: "/",
      redirect: "tableTest",
    },
    ...pageRouter,
  ],
});

// 路由跳转前
router.beforeEach((to:any, from:any, next:any) => {
  // 路由加载状态
  store.commit('routerModel/routerLoading', true);
  // 先加载认证中心
  bus.authReadyComplete().then(() => {
    // 路由加载状态
    const permissionsIds = store.getters['layout/permissionsIds'];
    NProgress.start();
    // 获取菜单
    const menuTree = store.getters['layout/menuTree'];
    const routePath = tool.getRoutersPath(pageRouter);
    // 需要加载的信息
    const awaitList = [
      { dataOrigin: connectAuth.getToken(), key: 'token'},
      { dataOrigin: connectAuth.getUserInfo(), key: 'userInfo'}
    ];
    if (common.isEmpty(permissionsIds)) {
      awaitList.push({ dataOrigin: connectAuth.getPermissions(), key: 'permissionsIds'});
    }
    // 获取的信息
    connectAuth.customGetInfo(awaitList).then(info => {
      // 不需要验证登录状态
      if (common.isEmpty(to.meta) || to.meta && typeof to.meta.requireAuth === 'boolean' && !to.meta.requireAuth) {
        const treeJson = tool.getTreePath(menuTree);
        store.commit('layout/noAccess', false);
        store.commit('layout/nonExist', !routePath.includes(to.path));
        // 设置标题
        tool.setTitle(treeJson.allItem, to);
        (common.isEmpty(menuTree) || menuTree.length === 0) ? connectAuth.getSysMenu().then(res => {
          next();
        }) : next();
        return;
      }
      // 获取不到登录信息，跳转登录
      if (common.isEmpty(info.token)) {
        NProgress.done();
        store.commit('routerModel/routerLoading', false);
        connectAuth.goToLogin();
        return;
      }
      tool.routerValidation(menuTree, routePath, to, next);
    })
  })
});

// 路由跳转后
router.afterEach((to:any, from:any) => {
  NProgress.done();
  store.commit('routerModel/routerLoading', false);
});

export default router;
