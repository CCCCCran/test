<template>
  <div
    :ref="`tag-${data.pageId}`"
    class="dyt-tree-demo"
    :class="{
      'is-disabled-tree': props.disabled,
      'tree-demo-hover': data.isHoverTree
    }"
    @mouseover="hoverTree"
    @mouseout="outTree"
    v-click-outside="clickPopoverOutside"
  >
    <el-popover
      ref="popoverRef"
      :placement="data.popoverPlacement"
      trigger="click"
      :width="data.popoverWidth"
      :hide-after="100"
      :disabled="props.disabled"
      v-model:visible="data.popoverVisible"
      popper-class="tree-popper-content"
      @after-enter="afterEnter"
      @after-leave="afterLeave"
      @show="popoverShow"
      @before-enter="showBefore"
      @hide="popoverHide"
    >
      <template #reference>
        <div class="dyt-tree-content" :class="{'content-active': data.isShow}" @click="showPopover">
          <div
            class="tree-content-value"
            :class="{
              'tree-content-multiple': typeof config.multiple === 'boolean' && config.multiple,
              'tree-content-limit': config.limit > 0 && config.multiple
            }"
          >
            <span v-if="data.vModel.length === 0" class="tree-placeholder">{{placeholder}}</span>
            <div v-else class="tree-tag-content">
              <template v-for="(item, index) in data.vModel" :key="index">
                <span
                  class="tree-tag-item"
                  v-if="config.limit === 0 || (index + 1) <= config.limit"
                  :style="`max-width:${config.limit <= 0 ? 100 : (100 / Math.min(data.vModel.length, config.limit))}%;`"
                >
                  <span class="tag-item-text">
                    {{data.treeDataJson[item] ? data.treeDataJson[item][config.props.label||'label'] : ''}}
                  </span>
                  <span class="tag-item-close" @click.stop="removeTag(item)" v-if="config.limit > 0 && config.multiple && !props.disabled">
                    <Icon name="close" />
                  </span>
                </span>
              </template>
            </div>
            
          </div>
          <span
            class="limit-tips"
            v-if="config.limit > 0 && (data.allValue.length - config.limit) > 0 && config.multiple"
          >
          <!-- v-if="config.limit > 0 && (data.vModel.length - config.limit) > 0 && config.multiple" -->
            <el-tooltip
              trigger="hover"
              effect="light"
              placement="bottom"
              popper-class="popper-limit-tips"
              :disabled="props.disabledTip || data.popoverVisible"
            >
              <!-- + {{data.vModel.length - config.limit}} -->
              + {{data.allValue.length - config.limit}}
              <template v-slot:content>
                <div class="popper-tips-content">
                  <template v-for="(tip, tIndex) in data.allValue" :key="`tip-${tIndex}`">
                    <span class="limit-tips-item">
                      {{tip.label || tip[config.props.label]}}
                    </span>
                  </template>
                </div>
              </template>
            </el-tooltip>
          </span>
          <div class="suffix-inner">
            <Icon @click.stop="clearTree" v-if="data.isHoverTree && data.vModel.length > 0" name="circle-close" />
            <Icon v-else :name="`${data.isShow ? 'arrow-up' : 'arrow-down'}`" />
          </div>
        </div>
      </template>
      <div class="dyt-tree-popover" :ref="`popover-${data.pageId}`">
        <dyt-input v-if="filterable" :ref="`input-${data.pageId}`" v-model="data.inputValue" type="text" placeholder="??????????????????" />
        <dyt-input v-model="data.valueValidation" type="text" style="display:none;" />
        <el-scrollbar
          :max-height="data.treeMaxHeight"
          :min-height="data.treeMinHeight"
          :style="`margin-top: 10px;`"
          :wrap-class="`${virtual? 'includes-virtual' : 'not-virtual'}`"
        >
          <el-tree
            v-if="!virtual"
            :ref="`tree-${data.pageId}`"
            class="filter-tree"
            :filter-node-method="filterNodeHand"
            :data="treeOptions"
            v-bind="config"
            :style="`width: ${typeof data.popoverTreeWidth === 'number' ? `${data.popoverTreeWidth}px` : data.popoverTreeWidth};`"
            @node-click="nodeClick"
            @check="check"
            @node-expand="nodeExpand"
            @node-collapse="nodeCollapse"
            @node-drag-end="nodeDragEnd"
          >
            <template v-slot:default="scope">
              <span class="el-tree-node__label" :class="{'is-disabled': scope.data[config.props.disabled]}">
                <slot v-bind="scope">
                  {{scope.data[config.props.label]}}
                </slot>
              </span>
            </template>
            <template v-for="slot in slots.filter((s) => !['default'].includes(s))" v-slot:[slot]="scope">
              <slot :name="slot" v-bind="scope" />
            </template>
          </el-tree>
          <el-tree-v2
            v-else
            :ref="`tree-${data.pageId}`"
            class="filter-tree"
            :filter-method="filterNodeHand"
            :data="treeOptions"
            v-bind="config"
            :fit-input-width="true"
            :style="`width: ${typeof data.popoverTreeWidth === 'number' ? `${data.popoverTreeWidth}px` : data.popoverTreeWidth};`"
            @node-click="nodeClick"
            @check="check"
            @node-expand="nodeExpand"
            @node-collapse="nodeCollapse"
            @node-drag-end="nodeDragEnd"
            :height="328"
          >
            <template v-slot:default="scope">
              <span class="el-tree-node__label" :class="{'is-disabled': scope.data[config.props.disabled]}">
                <slot v-bind="scope">
                  {{scope.data[config.props.label]}}
                </slot>
              </span>
            </template>
            <template v-for="slot in slots.filter((s) => !['default'].includes(s))" v-slot:[slot]="scope">
              <slot :name="slot" v-bind="scope" />
            </template>
          </el-tree-v2>
        </el-scrollbar>
      </div>
    </el-popover>
  </div>
</template>
<script lang="ts" setup>
import { reactive, useSlots, useAttrs, computed, onMounted, nextTick, watch, PropType } from 'vue';
import getGlobal from "@/utils/global";
import getProxy from "@/utils/proxy";

interface dataType {
  pageId: string;
  vModel: any;
  valueValidation: string;
  allValue: Array<any>;
  isHoverTree: boolean;
  treeDataJson: object;
  isShow: boolean;
  inputValue: string;
  popoverWidth: number;
  defaultConfig: any;
  treeProps: any,
  treeData: Array<any>;
  popoverVisible: boolean;
  popoverPlacement: string;
  treeMaxHeight: string | number;
  treeMinHeight: string | number;
  popoverTreeWidth: string | number | null;
}

const global = getGlobal();
const proxy = getProxy();
const $slots = useSlots();
const $attrs = useAttrs();
const emit = defineEmits(['show', 'showBefore', 'showAfter', 'hide', 'hideAfter', 'update:modelValue', 'input']);
const data:dataType = reactive({
  popoverVisible: false,
  valueValidation: '',
  popoverPlacement: 'bottom-start',
  pageId: Math.random().toString(36).substring(2),
  vModel: [],
  isHoverTree: false,
  allValue: [],
  treeDataJson: {},
  isShow: false,
  inputValue: '',
  popoverWidth: 200,
  treeMaxHeight: '328px',
  treeMinHeight: 50,
  popoverTreeWidth: null,
  defaultConfig: {
    'empty-text': '????????????!',
    'default-expand-all': true,
    'expand-on-click-node': false,
    'highlight-current': true
  },
  treeProps: { label: 'label', value: 'value', children: 'children', disabled: 'disabled', isLeaf: 'isLeaf', class: 'class' },
  treeData: [],
});
// ??????
const props = defineProps({
  modelValue: { type: [String, Array, Number], default: null },
  // ???????????????
  placeholder: { type: String, default: '?????????'},
  // ??????
  disabled: { type: Boolean, default: false },
  // ?????????????????????, ??? multiple ??? true ??????
  string: { type: Boolean, default: false },
  // ?????????????????????, ??? multiple ??? true ??????
  split: { type: String, default: ',' },
  // ?????????????????????, ??? multiple ??? true ????????????
  backArray: { type: Boolean, default: false },
  // ?????????????????????????????????(string ??? true ?????????)
  separStr: { type: String, default: ',' },
  // ????????????????????? 0 ????????????
  limit: { type:  Number, default: 0 },
  // ???????????????
  filterable: { type: Boolean, default: true },
  // ??????
  filterNodeMethod: { type: Function, default: () => {} },
  // ????????????,????????????
  data: { type: Array as PropType<Array<{[key:string]: any}>>, default: () => {return []} },
  options: { type: Array as PropType<Array<{[key:string]: any}>>, default: () => {return []} },
  // popoverTreeWidth: { type: [String, Number], default: null },
  // Props ??????
  defaultProps: { type: Object as PropType<{
    label?: string,
    value?: string,
    children?: string,
    disabled?: string,
    isLeaf?: string,
    class?: string,
    [key:string]: any
  }>, default: () => {return {}} },
  // ????????????????????????
  virtual: { type: Boolean,  default: false },
  // ???????????? tip
  disabledTip: { type: Boolean,  default: false }
});
// ??????
const slots = computed(() => {
  return Object.keys($slots)
})
// ????????????
const treeOptions = computed(() => {
  const treeData = initTreeData(global.$common.isEmpty(props.data) ? props.options : props.data);
  return treeData;
})

// ??????
const config = computed(() => {
  let config = {
    ...data.defaultConfig,
    props: {...data.treeProps, ...props.defaultProps},
    limit: props.limit,
    ...$attrs
  };
  if (config.disabled || config.readonly) {
    config.placeholder = '';
  }
  // ??????????????????????????????????????????
  if (typeof config['show-checkbox'] === 'boolean' && config['show-checkbox']) {
    config['multiple'] = true;
  }
  if (typeof config.multiple === 'boolean' && config.multiple) {
    config['show-checkbox'] = true;
    // ?????????????????????????????????
    config['highlight-current'] = false;
    config.limit = props.limit || 1;
  }
  if (!config['node-key']) {
    config['node-key'] = config.props.value ? config.props.value : 'value';
  }
  delete config.style;
  return config;
});
// ????????????
onMounted(() => {
  // ??????????????????
  proxy.$refs[`tag-${data.pageId}`] && (data.popoverWidth = proxy.$refs[`tag-${data.pageId}`].offsetWidth);
  // ???????????????
  nextTick(() => {
    data.vModel.forEach((key:any) => {
      config.value.multiple ? setChecked(key, true, !config.value['check-strictly']) : setCurrentKey(key);
    })
    config.value.multiple && checkedNodeHand();
  })
});
// ?????????????????????
const initTreeData  = (arr:Array<any> = [], disabled: boolean = false) => {
  arr.forEach((item: any) => {
    if (disabled) {
      item[config.value.props.disabled] = disabled;
    }
    if (!global.$common.isEmpty(item[config.value.props.children])) {
      initTreeData(item[config.value.props.children], item[config.value.props.disabled]);
    }
    data.treeDataJson[item[config.value.props.value]] = item;
  })
  return arr;
}
// ??????????????????
const popoverAdjust = () => {
  if (!proxy) return;
  nextTick(() => {
    const ele = proxy.$refs[`tag-${data.pageId}`];
    const content:any = proxy.$refs[`popover-${data.pageId}`].parentNode;
    const scrollTop = global.$common.getElementScrollTop(ele);
    const viewH = window.innerHeight;
    const coordinates = global.$common.getElementOffset(ele);
    data.popoverPlacement = `${(coordinates.y + content.offsetHeight + ele.offsetHeight + 30 > (scrollTop + viewH)) ? 'top' : 'bottom'}-start`;
  })
}
// ?????????
const showBefore = () => {
  popoverAdjust();
  proxy.$refs[`tag-${data.pageId}`] && (data.popoverWidth = proxy.$refs[`tag-${data.pageId}`].offsetWidth);
  emit('showBefore');
  nextTick(() => {
    if (global.$common.isEmpty(data.vModel)) {
      !config.value.multiple && setCurrentKey(null);
      return;
    }
    data.vModel.forEach((key:any) => {
      !config.value.multiple && setCurrentKey(key);
    })
  })
}
// ???????????????
const popoverShow = () => {
  data.isShow = true;
  emit('show');
  nextTick(() => {
    setTreeWidth();
  });
}
// ????????????
const setTreeWidth = () => {
  let itemList:Array<any> = [];
  if (!proxy) return;
  const content = proxy.$refs[`popover-${data.pageId}`];
  const itemDemo:Array<HTMLElement> = content.querySelectorAll('.el-tree-node__content .el-tree-node__label');
  itemDemo.forEach(item => {
    itemList.push(item.offsetWidth + 110);
  })
  itemList.push(global.$common.getElementStyle(content.querySelector('.el-scrollbar__wrap'), 'width', true));
  data.popoverTreeWidth = Math.max.apply('', global.$common.arrRemoveRepeat(itemList));
  const treeView = content.querySelector('.el-scrollbar__view');
  treeView.style.width = `${data.popoverTreeWidth}px`;
  // console.log(Math.max.apply('', global.$common.arrRemoveRepeat(itemList)))
}
// ?????????????????????????????????
const afterEnter = () => {
  emit('showAfter');
  proxy.$refs[`input-${data.pageId}`] && proxy.$refs[`input-${data.pageId}`].focus();
}
// ???????????????
const popoverHide = () => {
  data.isShow = false;
  emit('hide');
}
// ?????????????????????????????????
const afterLeave = () => {
  // ??????????????????
  nextTick(() => {
    emit('hideAfter');
  })
}
// ??????????????????
const filterNodeHand = (value:string, datas:any) => {
  setTimeout(() => {
    setTreeWidth();
    popoverAdjust();
  }, 400)
  const isPass = props.filterNodeMethod(value, datas);
  if (typeof isPass === 'boolean') return isPass;
  if (global.$common.isEmpty(value, true)) return true;
  if (global.$common.isEmpty(config.value.props.label)) return datas.label.indexOf(value) !== -1;
  return datas[config.value.props.label].indexOf(value) !== -1;
}
// ??????(?????????)
const nodeClick = (node:any, datas:any, event:any) => {
  if (config.value.multiple) return;
  data.allValue = global.$common.copy(node);
  if (node[config.value.props.disabled]) {
    data.vModel.forEach((key:any) => {
      setCurrentKey(key);
    });
    return;
  }
  const newValue = !global.$common.isEmpty(config.value.props.value) ? node[config.value.props.value] : node.value;
  data.vModel = [newValue];
  nextTick(() => {
    data.popoverVisible = false;
  });
}
// ?????????????????????????????????(????????????)
const check = (node:any) => {
  if (!config.value.multiple) return;
  // ???????????????
  checkedNodeHand(true);
  nextTick(() => {
    proxy.$refs[`input-${data.pageId}`] && proxy.$refs[`input-${data.pageId}`].focus();
  });
}
// ??????????????????
const nodeExpand = () => {
  nextTick(() => {
    proxy.$refs[`input-${data.pageId}`] && proxy.$refs[`input-${data.pageId}`].focus();
    setTimeout(() => {
      setTreeWidth();
      popoverAdjust();
    }, 350)
  });
}
// ??????????????????
const nodeCollapse = () => {
  nextTick(() => {
    proxy.$refs[`input-${data.pageId}`] && proxy.$refs[`input-${data.pageId}`].focus();
    setTimeout(() => {
      setTreeWidth();
      popoverAdjust();
    }, 350)
  });
}
// ????????????????????????????????????
const nodeDragEnd = () => {
  nextTick(() => {
    proxy.$refs[`input-${data.pageId}`] && proxy.$refs[`input-${data.pageId}`].focus();
  });
}
// ??????
const hoverTree = () => {
  data.isHoverTree = true;
}
// ??????
const outTree = () => {
  data.isHoverTree = false;
}
// ??????
const clearTree = () => {
  if (!data.isHoverTree || data.vModel.length === 0 || props.disabled) return;
  // ????????????
  data.vModel.forEach((key:any) => {
    config.value.multiple && setChecked(key, false, !config.value['check-strictly']);
    !config.value.multiple && setCurrentKey(null);
  });
  data.vModel = [];
  data.allValue = [];
}

// ?????????
const updateVal = (val:any) => {
  data.valueValidation = `${Math.random().toString(36).substring(2)}${Math.random().toString(36).substring(2)}`;
  emit('update:modelValue', val);
  emit('input', val);
}
// ????????????
const removeTag = (key:any) => {
  setChecked(key, false, !config.value['check-strictly']);
  // ???????????????
  checkedNodeHand(true);
}
// ???????????????
const checkedNodeHand = (assignment:boolean = false) => {
  nextTick(() => {
    const checkNodes = getCheckedNodes();
    const valKey = config.value.props.value ? config.value.props.value : 'value';
    const childKey = config.value.props.children ? config.value.props.children : 'children';
    let checkKeys = getCheckedKeys();
    data.allValue = global.$common.copy(checkNodes);
    const handArr = (arr:Array<any>, isRemove = false) => {
      arr.forEach((item:any) => {
        if (checkKeys.includes(item[valKey]) && isRemove) {
          checkKeys.splice(checkKeys.indexOf(item[valKey]), 1);
        }
        global.$common.isArray(item[childKey]) && handArr(item[childKey], true);
      })
    }
    !config.value['check-strictly'] && handArr(checkNodes);
    assignment && (data.vModel = checkKeys);
    if (JSON.stringify(props.modelValue) === JSON.stringify(data.vModel)) return;
  })
}
// ????????????
const showPopover = () => {
  // data.popoverVisible = props.disabled ? false : !data.popoverVisible;
}
// ?????????????????????????????????
const clickPopoverOutside = (e:any) => {
  // ????????????????????????
  if (proxy.$refs[`popover-${data.pageId}`].contains(e.target) || !data.popoverVisible) return;
  data.popoverVisible = false;
}
// el-tree ?????????
// ??????????????????????????????????????????????????????
const filter = (val:any = null) => {
  proxy?.$refs[`tree-${data.pageId}`]?.filter(val);
}
// ?????????????????????????????????????????? node-key ????????????????????????
const updateKeyChildren = (key:any = null, resources:any = null)  => {
  proxy?.$refs[`tree-${data.pageId}`]?.updateKeyChildren(key, resources);
}
// ??????????????????????????????(show-checkbox ??? true), ?????????????????????????????????????????????
const getCheckedNodes = (leafOnly:any = null, includeHalfChecked:any = null) => {
  return proxy?.$refs[`tree-${data.pageId}`]?.getCheckedNodes(leafOnly, includeHalfChecked);
}
// ??????????????????????????????????????????????????????????????? node-key ??????, ?????????????????????????????????
const setCheckedNodes = (val:any = null) => {
  proxy?.$refs[`tree-${data.pageId}`]?.setCheckedNodes(val);
}
// ???????????????????????? (show-checkbox ??? true), ?????????????????????????????? key ?????????
const getCheckedKeys = (leafOnly:any = null) => {
  return proxy?.$refs[`tree-${data.pageId}`]?.getCheckedKeys(leafOnly);
}
// ????????????????????????????????????????????????????????? node-key ??????
const setCheckedKeys = (keys:any = null, leafOnly:any = null) => {
  return proxy?.$refs[`tree-${data.pageId}`]?.setCheckedKeys(keys, leafOnly);
}
// ???????????????????????????, ??????????????????????????? node-key ??????
const setChecked = (resources:any = null, checked:any = null, deep:any = null) => {
  proxy?.$refs[`tree-${data.pageId}`]?.setChecked(resources, checked, deep);
}
// ??????????????????????????? (show-checkbox ??? true), ???????????????????????????????????????????????????
const getHalfCheckedNodes = () => {
  return proxy?.$refs[`tree-${data.pageId}`]?.getHalfCheckedNodes();
}
// ?????????????????????(show-checkbox ??? true)??????????????????????????????????????? key ??????????????????
const getHalfCheckedKeys = (val:any = null) => {
  return proxy?.$refs[`tree-${data.pageId}`]?.getHalfCheckedKeys(val);
}
// ???????????????????????????????????? (????????????????????? null)
const getCurrentKey = () => {
  return proxy?.$refs[`tree-${data.pageId}`]?.getCurrentKey();
}
// ???????????????????????????????????? (????????????????????? null)
const getCurrentNode = () => {
  return proxy?.$refs[`tree-${data.pageId}`]?.getCurrentNode();
}
// ?????? key ????????????????????????????????????????????????????????????????????? node-key  ??????
const setCurrentKey = (key:any = null, shouldAutoExpandParent = true) => {
  proxy?.$refs[`tree-${data.pageId}`]?.setCurrentKey(key, shouldAutoExpandParent);
}
// ????????????????????????????????????????????????????????? node-key ??????
const setCurrentNode = (node:any = null, shouldAutoExpandParent = true) => {
  proxy?.$refs[`tree-${data.pageId}`]?.setCurrentNode(node, shouldAutoExpandParent);
}
// ?????? data ?????? key ?????? Tree ???????????? node
const getNode = (resources:any = null) => {
  return proxy?.$refs[`tree-${data.pageId}`]?.getNode(resources);
}
// ?????? Tree ???????????????????????????????????????????????? node-key ??????
const remove = (resources:any = null) => {
  proxy?.$refs[`tree-${data.pageId}`]?.remove(resources);
}
// ??? Tree ???????????????????????????????????????
const append = (resources:any = null, parentNode:any = null) => {
  proxy?.$refs[`tree-${data.pageId}`]?.append(resources, parentNode);
}
// ??? Tree ????????????????????????????????????
const insertBefore = (resources:any = null, refNode:any = null) => {
  proxy?.$refs[`tree-${data.pageId}`]?.insertBefore(resources, refNode);
}
// ??? Tree ????????????????????????????????????
const insertAfter = (resources:any = null, refNode:any = null) => {
  proxy?.$refs[`tree-${data.pageId}`]?.insertAfter(resources, refNode);
}
// ?????????????????????
const getAllChecked = () => {
  return config.value.multiple ? data.allValue : data.vModel;
}
// ???????????????
watch(() => props.modelValue, (val:any) => {
  if (JSON.stringify(val) === JSON.stringify(data.vModel)) return;
  const oldtModel = global.$common.copy(data.vModel);
  if (props.string && config.value.multiple) {
    data.vModel = global.$common.isEmpty(val) ? [] : global.$common.split(val, props.split);
  } else if (!Array.isArray(val)) {
    data.vModel = global.$common.isEmpty(val) ? [] : Array.isArray(val) ? val : [val];
  } else {
    data.vModel = global.$common.isEmpty(val) ? [] : val;
  }
  if (!config.value.multiple) {
    data.vModel = data.vModel[0] ? [data.vModel[0]] : [];
  }
  if (!proxy.$refs[`tree-${data.pageId}`]) return;
  // ???????????????
  data.vModel.forEach((key:any) => {
    config.value.multiple && setChecked(key, true, !config.value['check-strictly']);
    !config.value.multiple && setCurrentKey(key);
  });
  // ??????????????????
  oldtModel.forEach((key:any) => {
    if (!data.vModel.includes(key)) {
      config.value.multiple && setChecked(key, false, !config.value['check-strictly']);
      !config.value.multiple && setCurrentKey(key, false);
    }
  });
  config.value.multiple && checkedNodeHand();
}, {immediate: true, deep: true});
// ???????????????
watch(() => data.inputValue, (val) => {
  filter(val);
}, {deep: true});
// ???????????????
watch(() => data.vModel, (val, old) => {
  updateVal(config.value.multiple ? (props.string ? global.$common.split(val, props.separStr || props.split) : val) : (props.backArray ? val : val[0]));
}, {deep: true});

// ????????????
defineExpose({
  filter,
  updateKeyChildren,
  getCheckedNodes,
  setCheckedNodes,
  getCheckedKeys,
  setCheckedKeys,
  setChecked,
  getHalfCheckedNodes,
  getHalfCheckedKeys,
  getCurrentKey,
  getCurrentNode,
  setCurrentKey,
  setCurrentNode,
  getNode,
  remove,
  append,
  insertBefore,
  insertAfter,
  getAllChecked
});
</script>

<style lang="less">
.dyt-tree-demo {
  position: relative;
  width: 100%;
  cursor: pointer;
  &.is-disabled-tree{
    .dyt-tree-content{
      background-color: var(--el-disabled-bg-color);
      cursor: no-drop;
      .tag-item-text{
        color:  var(--el-text-color-placeholder);
      }
    }
  }
  .dyt-tree-content{
    position: relative;
    display: flex;
    width: 100%;
    min-height: var(--dyt-form-item-height);
    line-height: 1em;
    -webkit-appearance: none;
    border: var(--el-border);
    box-sizing: border-box;
    color: var(--el-input-text-color, var(--el-text-color-regular));
    font-size: inherit;
    background-color: #FFF;
    background-image: none;
    border-radius: 4px;
    transition: border-color .2s cubic-bezier(.645,.045,.355,1);
    &.content-active{
      border-color: var(--el-input-focus-border, var(--el-color-primary));
    }
    .tree-content-value{
      display: flex;
      flex: 100;
      padding: 0 0 0 11px;
      margin-right: 0;
      height: calc(var(--dyt-form-item-height) - 2px);
      line-height: calc(var(--dyt-form-item-height) - 2px);
      overflow: hidden;
      .tree-placeholder{
        color: var(--dyt-placeholder-color);
      }
      .tree-tag-content{
        flex: 100;
        max-width: calc(100% - 5px);
        .tree-tag-item{
          display: inline-block;
          .tag-item-text{
            display: inline-block;
            max-width: 100%;
            white-space: nowrap;
            text-overflow: ellipsis;
            overflow: hidden;
          }
        }
      }
    }
    .tree-content-multiple{
      .tree-tag-content{
        display: flex;
        flex: 100;
        .tree-tag-item{
          display: flex;
          padding: 0 0 0 5px;
          margin: 3px 6px 3px 0;
          line-height: calc(var(--dyt-form-item-height) - 12px);
          border-radius: 3px;
        }
      }
      &.tree-content-limit{
        .tree-tag-content{
          .tree-tag-item{
            flex: 100;
            background: #f4f4f5;
            border: 1px solid #e9e9eb;
            color: #909399;
            &:hover{
              color: #909399;
            }
            .tag-item-text{
              flex: 100;
              display: inline-block;
              white-space: nowrap;
              text-overflow: ellipsis;
              overflow: hidden;
            }
            .tag-item-close{
              position: relative;
              width: 20px;
              .el-icon{
                position: absolute;
                top: 50%;
                left: 50%;
                border-radius: 100%;
                transform: translate(-50%, -50%);
              }
              &:hover{
                .el-icon{
                  color: #fff;
                  background-color: #909399;
                }
              }
            }
          }
        }
      }
    }
    .limit-tips{
      margin: 0 5px 0 0;
      line-height: 30px;
      color: #ddd;
      white-space: nowrap;
    }
    .suffix-inner{
      display: inline-flex;
      padding-right: 10px;
      text-align: center;
      color: var(--el-input-icon-color,var(--el-text-color-placeholder));
      transition: all var(--el-transition-duration);
      .el-icon{
        height: calc(100% - 2px);
      }
    }
  }
}
.tree-popper-content{
  .is-disabled {
    color:  var(--el-text-color-placeholder);
    cursor: no-drop;
  }
  .includes-virtual{
    margin-bottom: 10px;
  }
  .not-virtual{
    .filter-tree{
      margin-bottom: 10px;
    }
  }
  .el-tree-node__content>.el-tree-node__expand-icon{
    padding: 3px;
    font-size: 18px;
  }
}
</style>