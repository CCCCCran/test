<template>
  <div
    :ref="`tag-${pageId}`"
    class="dyt-tree-demo"
    :class="{
      'is-disabled-tree': disabled,
      'tree-demo-hover': isHoverTree
    }"
    @mouseover="hoverTree"
    @mouseout="outTree"
    v-click-outside="clickPopoverOutside"
  >
    <el-popover
      ref="popoverRef"
      :placement="popoverPlacement"
      :width="popoverWidth"
      :hide-after="100"
      v-model:visible="popoverVisible"
      popper-class="tree-popper-content"
      @after-enter="afterEnter"
      @after-leave="afterLeave"
      @show="popoverShow"
      @before-enter="showBefore"
      @hide="popoverHide"
    >
      <template #reference>
        <div
          class="dyt-tree-content"
          :class="{'content-active': isShow}"
          @click="showPopover"
        >
          <div
            class="tree-content-value"
            :class="{
              'tree-content-multiple': typeof config.multiple === 'boolean' && config.multiple,
              'tree-content-limit': config.limit > 0 && config.multiple
            }"
          >
            <span v-if="vModel.length === 0" class="tree-placeholder">{{placeholder}}</span>
            <div
              v-else
              class="tree-tag-content"
            >
              <template v-for="(item, index) in vModel" :key="index">
                <span
                  class="tree-tag-item"
                  v-if="config.limit === 0 || (index + 1) <= config.limit"
                  :style="`max-width:${config.limit <= 0 ? 100 : (100 / Math.min(vModel.length, config.limit))}%;`"
                >
                  <span class="tag-item-text">
                    {{treeDataJson[item] ? treeDataJson[item][config.props.label||'label'] : ''}}
                  </span>
                  <span class="tag-item-close" @click.stop="removeTag(item)" v-if="config.limit > 0 && config.multiple">
                    <Icon name="close" />
                  </span>
                </span>
              </template>
            </div>
            
          </div>
          <!-- :style="`width:${((vModel.length - config.limit).toString().length + 1) * 14}px;color: #ddd; white-space: nowrap;`" -->
          <span
            class="limit-tips"
            v-if="config.limit > 0 && (vModel.length - config.limit) > 0 && config.multiple"
          > + {{vModel.length - config.limit}}</span>
          <div class="suffix-inner">
            <Icon @click.stop="clearTree" v-if="isHoverTree && vModel.length > 0" name="circle-close" />
            <Icon v-else :name="`${isShow ? 'arrow-up' : 'arrow-down'}`" />
          </div>
        </div>
      </template>
      <div class="dyt-tree-popover" :ref="`popover-${pageId}`">
        <dyt-input v-if="filterable" :ref="`input-${pageId}`" v-model="inputValue" type="text" placeholder="??????????????????" />
        <el-scrollbar
          :max-height="treeMaxHeight"
          :min-height="treeMinHeight"
          :style="`margin-top: 10px;`"
          :wrap-class="`${virtual? 'includes-virtual' : 'not-virtual'}`"
        >
          <el-tree
            v-if="!virtual"
            :ref="`tree-${pageId}`"
            class="filter-tree"
            :filter-node-method="filterNodeHand"
            :data="treeOptions"
            v-bind="config"
            :style="`width: ${typeof popoverTreeWidth === 'number' ? `${popoverTreeWidth}px` : popoverTreeWidth};`"
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
            :ref="`tree-${pageId}`"
            class="filter-tree"
            :filter-method="filterNodeHand"
            :data="treeOptions"
            v-bind="config"
            :style="`width: ${typeof popoverTreeWidth === 'number' ? `${popoverTreeWidth}px` : popoverTreeWidth};`"
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
<script lang="ts">
import { defineComponent } from 'vue';

interface dataType {
  pageId: string;
  vModel: any;
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
export default defineComponent({
  name: 'DytTreeSelect',
  components: {},
  props: {
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
    // ????????????????????????????????????string ??? true ????????????
    separStr: { type: String, default: ',' },
    // ????????????????????? 0 ????????????
    limit: { type:  Number, default: 0 },
    // ???????????????
    filterable: { type: Boolean, default: true },
    // ??????
    filterNodeMethod: { type: Function, default: () => {} },
    // ????????????,????????????
    data: { type: Array, default: () => {return []} },
    options: { type: Array, default: () => {return []} },
    // popoverTreeWidth: { type: [String, Number], default: null },
    // Props ??????
    defaultProps: { type: Object, default: () => {return {}} },
    // ????????????????????????
    virtual: { type: Boolean,  default: false }
  },
  emits: ['show', 'showBefore', 'showAfter', 'hide', 'hideAfter', 'update:modelValue', 'input'],
  data ():dataType {
    return {
      popoverVisible: false,
      popoverPlacement: 'bottom-start',
      pageId: Math.random().toString(36).substring(2),
      vModel: [],
      isHoverTree: false,
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
    }
  },
  computed: {
    slots () {
      return Object.keys(this.$slots)
    },
    treeOptions () {
      const treeData = this.initTreeData(this.$common.isEmpty(this.data) ? this.options : this.data);
      // console.log(treeData, this.config.props, this.defaultProps)
      return treeData;
    },
    config () {
      let config = {
        ...this.defaultConfig,
        props: {...this.treeProps, ...this.defaultProps},
        limit: this.limit,
        ...this.$attrs
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
        config.limit = this.limit || 1;
      }
      if (!config['node-key']) {
        config['node-key'] = config.props.value ? config.props.value : 'value';
      }
      delete config.style;
      return config;
    }
  },
  watch: {
    modelValue: {
      deep: true,
      immediate: true,
      handler (val) {
        if (JSON.stringify(val) === JSON.stringify(this.vModel)) return;
        const oldtModel = this.$common.copy(this.vModel);
        if (this.string && this.config.multiple) {
          this.vModel = this.$common.isEmpty(val) ? [] : this.$common.split(val, this.split);
        } else if (!Array.isArray(val)) {
          this.vModel = this.$common.isEmpty(val) ? [] : Array.isArray(val) ? val : [val];
        } else {
          this.vModel = this.$common.isEmpty(val) ? [] : val;
        }
        if (!this.config.multiple) {
          this.vModel = this.vModel[0] ? [this.vModel[0]] : [];
        }
        // ???????????????
        this.vModel.forEach((key:any) => {
          this.config.multiple && this.setChecked(key, true, !this.config['check-strictly']);
          !this.config.multiple && this.setCurrentKey(key);
        });
        // ??????????????????
        oldtModel.forEach((key:any) => {
          if (!this.vModel.includes(key)) {
            this.config.multiple && this.setChecked(key, false, !this.config['check-strictly']);
            !this.config.multiple && this.setCurrentKey(key, false);
          }
        });
        this.config.multiple && this.checkedNodeHand();
      }
    },
    inputValue: {
      deep: true,
      handler (val) {
        this.filter(val);
      }
    }
  },
  created () {},
  mounted () {
    // ??????????????????
    this.$refs[`tag-${this.pageId}`] && (this.popoverWidth = this.$refs[`tag-${this.pageId}`].offsetWidth);
    this.$nextTick(() => {
      this.vModel.forEach((key:any) => {
        this.config.multiple && this.setChecked(key, true, !this.config['check-strictly']);
      })
      this.config.multiple && this.checkedNodeHand();
    });
  },
  methods: {
    // ???????????????
    initTreeData (arr:Array<any> = [], disabled: boolean = false) {
      arr.forEach((item: any) => {
        if (disabled) {
          item[this.config.props.disabled] = disabled;
        }
        if (!this.$common.isEmpty(item[this.config.props.children])) {
          this.initTreeData(item[this.config.props.children], item[this.config.props.disabled]);
        }
        this.treeDataJson[item[this.config.props.value]] = item;
      })
      return arr;
    },
    // ??????????????????
    popoverAdjust () {
      this.$nextTick(() => {
        const ele = this.$refs[`tag-${this.pageId}`];
        const content:any = this.$refs[`popover-${this.pageId}`].parentNode;
        const scrollTop = this.$common.getElementScrollTop(ele);
        const viewH = window.innerHeight;
        const coordinates = this.$common.getElementOffset(ele);
        this.popoverPlacement = `${(coordinates.y + content.offsetHeight + ele.offsetHeight + 30 > (scrollTop + viewH)) ? 'top' : 'bottom'}-start`;
      })
    },
    // ?????????
    showBefore () {
      this.popoverAdjust();
      this.$refs[`tag-${this.pageId}`] && (this.popoverWidth = this.$refs[`tag-${this.pageId}`].offsetWidth);
      this.$emit('showBefore');
      this.$nextTick(() => {
        if (this.$common.isEmpty(this.vModel)) {
          !this.config.multiple && this.setCurrentKey(null);
          return;
        }
        this.vModel.forEach((key:any) => {
          !this.config.multiple && this.setCurrentKey(key);
        })
      })
    },
    // ???????????????
    popoverShow () {
      this.isShow = true;
      this.$emit('show');
      this.$nextTick(() => {
        this.setTreeWidth();
      });
    },
    // ????????????
    setTreeWidth () {
      let itemList:Array<any> = [];
      const content:any = this.$refs[`popover-${this.pageId}`];
      const itemDemo:any = content.querySelectorAll('.el-tree-node__content .el-tree-node__label');
      itemDemo.forEach((item:any) => {
        itemList.push(item.offsetWidth + 110);
      })
      itemList.push(this.$common.getElementStyle(content.querySelector('.el-scrollbar__wrap'), 'width', true));
      this.popoverTreeWidth = Math.max.apply('', this.$common.arrRemoveRepeat(itemList));
      // this.api
      const treeView = content.querySelector('.el-scrollbar__view');
      treeView.style.width = `${this.popoverTreeWidth}px`;
      // console.log(Math.max.apply('', this.$common.arrRemoveRepeat(itemList)))
    },
    // ?????????????????????????????????
    afterEnter () {
      this.$emit('showAfter');
      this.$refs[`input-${this.pageId}`] && this.$refs[`input-${this.pageId}`].focus();
    },
    // ???????????????
    popoverHide () {
      this.isShow = false;
      this.$emit('hide');
    },
    // ?????????????????????????????????
    afterLeave () {
      // ??????????????????
      this.$nextTick(() => {
        this.$emit('hideAfter');
      })
    },
    // ??????????????????
    filterNodeHand (value:string, data:any) {
      setTimeout(() => {
        this.setTreeWidth();
        this.popoverAdjust();
      }, 400)
      const isPass = this.filterNodeMethod(value, data);
      if (typeof isPass === 'boolean') return isPass;
      if (this.$common.isEmpty(value, true)) return true;
      if (this.$common.isEmpty(this.config.props.label)) return data.label.indexOf(value) !== -1;
      return data[this.config.props.label].indexOf(value) !== -1;
    },
    // ??????(?????????)
    nodeClick (node:any, data:any, event:any) {
      if (this.config.multiple) return;
      if (node[this.config.props.disabled]) {
        this.vModel.forEach((key:any) => {
          this.setCurrentKey(key);
        });
        return;
      }
      const newValue = !this.$common.isEmpty(this.config.props.value) ? node[this.config.props.value] : node.value;
      this.vModel = [newValue];
      this.updateVal(this.backArray ? [newValue] : newValue);
      this.$nextTick(() => {
        this.popoverVisible = false;
      });
    },
    // ?????????????????????????????????(????????????)
    check (node:any) {
      if (!this.config.multiple) return;
      // ???????????????
      this.checkedNodeHand();
      this.$nextTick(() => {
        this.$refs[`input-${this.pageId}`] && this.$refs[`input-${this.pageId}`].focus();
      });
    },
    // ??????????????????
    nodeExpand () {
      this.$nextTick(() => {
        this.$refs[`input-${this.pageId}`] && this.$refs[`input-${this.pageId}`].focus();
        setTimeout(() => {
          this.setTreeWidth();
          this.popoverAdjust();
        }, 350)
      });
    },
    // ??????????????????
    nodeCollapse () {
      this.$nextTick(() => {
        this.$refs[`input-${this.pageId}`] && this.$refs[`input-${this.pageId}`].focus();
        setTimeout(() => {
          this.setTreeWidth();
          this.popoverAdjust();
        }, 350)
      });
    },
    // ????????????????????????????????????
    nodeDragEnd () {
      this.$nextTick(() => {
        this.$refs[`input-${this.pageId}`] && this.$refs[`input-${this.pageId}`].focus();
      });
    },
    // ??????
    hoverTree () {
      this.isHoverTree = true;
    },
    // ??????
    outTree () {
      this.isHoverTree = false;
    },
    // ??????
    clearTree () {
      if (!this.isHoverTree || this.vModel.length === 0 || this.disabled) return;
      // ????????????
      this.vModel.forEach((key:any) => {
        this.config.multiple && this.setChecked(key, false, !this.config['check-strictly']);
        !this.config.multiple && this.setCurrentKey(null);
      });
      this.vModel = [];
      this.updateVal(this.config.multiple ? this.string ? '' : [] : this.backArray ? [] : '');
    },
    // ?????????
    updateVal (val:any) {
      this.$emit('update:modelValue', val);
      this.$emit('input', val);
    },
    // ????????????
    removeTag (key:any) {
      this.setChecked(key, false, !this.config['check-strictly']);
      // ???????????????
      this.checkedNodeHand();
    },
    // ???????????????
    checkedNodeHand () {
      this.$nextTick(() => {
        const checkNodes = this.getCheckedNodes();
        const valKey = this.config.props.value ? this.config.props.value : 'value';
        const childKey = this.config.props.children ? this.config.props.children : 'children';
        let checkKeys = this.getCheckedKeys();
        const handArr = (arr:Array<any>, isRemove = false) => {
          arr.forEach((item:any) => {
            if (checkKeys.includes(item[valKey]) && isRemove) {
              checkKeys.splice(checkKeys.indexOf(item[valKey]), 1);
            }
            this.$common.isArray(item[childKey]) && handArr(item[childKey], true);
          })
        }
        !this.config['check-strictly'] && handArr(checkNodes);
        this.vModel = checkKeys;
        if (JSON.stringify(this.modelValue) === JSON.stringify(this.vModel)) return;
        this.updateVal(this.string ? this.$common.split(this.vModel, this.split) : this.vModel);
      })
    },
    // ????????????
    showPopover () {
      this.popoverVisible = this.disabled ? false : !this.popoverVisible;
    },
    // ?????????????????????????????????
    clickPopoverOutside (e:any) {
      // ????????????????????????
      if (this.$refs[`popover-${this.pageId}`].contains(e.target) || !this.popoverVisible) return;
      this.popoverVisible = false;
    },
    // el-tree ?????????
    // ??????????????????????????????????????????????????????
    filter (val:any = null) {
      this.$refs[`tree-${this.pageId}`] && this.$refs[`tree-${this.pageId}`].filter(val);
    },
    // ?????????????????????????????????????????? node-key ????????????????????????
    updateKeyChildren (key:any = null, data:any = null) {
      this.$refs[`tree-${this.pageId}`] && this.$refs[`tree-${this.pageId}`].updateKeyChildren(key, data);
    },
    // ??????????????????????????????(show-checkbox ??? true), ?????????????????????????????????????????????
    getCheckedNodes (leafOnly:any = null, includeHalfChecked:any = null) {
      return this.$refs[`tree-${this.pageId}`] && this.$refs[`tree-${this.pageId}`].getCheckedNodes(leafOnly, includeHalfChecked);
    },
    // ??????????????????????????????????????????????????????????????? node-key ??????, ?????????????????????????????????
    setCheckedNodes (val:any = null) {
      this.$refs[`tree-${this.pageId}`] && this.$refs[`tree-${this.pageId}`].setCheckedNodes(val);
    },
    // ???????????????????????? (show-checkbox ??? true), ?????????????????????????????? key ?????????
    getCheckedKeys (leafOnly:any = null) {
      return this.$refs[`tree-${this.pageId}`] && this.$refs[`tree-${this.pageId}`].getCheckedKeys(leafOnly);
    },
    // ????????????????????????????????????????????????????????? node-key ??????
    setCheckedKeys (keys:any = null, leafOnly:any = null) {
      return this.$refs[`tree-${this.pageId}`] && this.$refs[`tree-${this.pageId}`].setCheckedKeys(keys, leafOnly);
    },
    // ???????????????????????????, ??????????????????????????? node-key ??????
    setChecked (data:any = null, checked:any = null, deep:any = null) {
      this.$refs[`tree-${this.pageId}`] && this.$refs[`tree-${this.pageId}`].setChecked(data, checked, deep);
    },
    // ??????????????????????????? (show-checkbox ??? true), ???????????????????????????????????????????????????
    getHalfCheckedNodes () {
      return this.$refs[`tree-${this.pageId}`] && this.$refs[`tree-${this.pageId}`].getHalfCheckedNodes();
    },
    // ?????????????????????(show-checkbox ??? true)??????????????????????????????????????? key ??????????????????
    getHalfCheckedKeys (val:any = null) {
      return this.$refs[`tree-${this.pageId}`] && this.$refs[`tree-${this.pageId}`].getHalfCheckedKeys(val);
    },
    // ???????????????????????????????????? (????????????????????? null)
    getCurrentKey () {
      return this.$refs[`tree-${this.pageId}`] && this.$refs[`tree-${this.pageId}`].getCurrentKey();
    },
    // ???????????????????????????????????? (????????????????????? null)
    getCurrentNode () {
      return this.$refs[`tree-${this.pageId}`] && this.$refs[`tree-${this.pageId}`].getCurrentNode();
    },
    // ?????? key ????????????????????????????????????????????????????????????????????? node-key  ??????
    setCurrentKey (key:any = null, shouldAutoExpandParent = true) {
      this.$refs[`tree-${this.pageId}`] && this.$refs[`tree-${this.pageId}`].setCurrentKey(key, shouldAutoExpandParent);
    },
    // ????????????????????????????????????????????????????????? node-key ??????
    setCurrentNode (node:any = null, shouldAutoExpandParent = true) {
      this.$refs[`tree-${this.pageId}`] && this.$refs[`tree-${this.pageId}`].setCurrentNode(node, shouldAutoExpandParent);
    },
    // ?????? data ?????? key ?????? Tree ???????????? node
    getNode (data:any = null) {
      return this.$refs[`tree-${this.pageId}`] && this.$refs[`tree-${this.pageId}`].getNode(data);
    },
    // ?????? Tree ???????????????????????????????????????????????? node-key ??????
    remove (data:any = null) {
      this.$refs[`tree-${this.pageId}`] && this.$refs[`tree-${this.pageId}`].remove(data);
    },
    // ??? Tree ???????????????????????????????????????
    append (data:any = null, parentNode:any = null) {
      this.$refs[`tree-${this.pageId}`] && this.$refs[`tree-${this.pageId}`].append(data, parentNode);
    },
    // ??? Tree ????????????????????????????????????
    insertBefore (data:any = null, refNode:any = null) {
      this.$refs[`tree-${this.pageId}`] && this.$refs[`tree-${this.pageId}`].insertBefore(data, refNode);
    },
    // ??? Tree ????????????????????????????????????
    insertAfter (data:any = null, refNode:any = null) {
      this.$refs[`tree-${this.pageId}`] && this.$refs[`tree-${this.pageId}`].insertAfter(data, refNode);
    }
  }
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
  // &.tree-demo-hover{}
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
      margin-right: 10px;
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
        // max-width: calc(100% - 50px);
        // height: calc(var(--dyt-form-item-height) - 6px);
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
              // .el-icon{}
            }
          }
        }
      }
    }
    .limit-tips{
      margin: 0 10px 0 0;
      line-height: 30px;
      color: #ddd;
      white-space: nowrap;
    }
    .suffix-inner{
      display: inline-flex;
      // position: absolute;
      // height: 100%;
      // right: 0;
      // top: 0;
      padding-right: 10px;
      text-align: center;
      color: var(--el-input-icon-color,var(--el-text-color-placeholder));
      transition: all var(--el-transition-duration);
      // pointer-events: none;
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