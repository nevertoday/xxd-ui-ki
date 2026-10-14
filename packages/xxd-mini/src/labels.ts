// 组件里自带的字（按钮、读屏说明）：中文和英文
export type Lang = "zh" | "en";

export const LABELS = {
  zh: {
    cancel: "取消",
    confirm: "确定",
    close: "关闭",
    back: "返回",
    loading: "加载中",
    loadMore: "加载更多",
    noMore: "没有更多了",
    retry: "重试",
    clear: "清空",
    search: "搜索",
    delete: "删除",
    more: "更多",
    upload: "添加图片",
    remove: "移除",
    done: "完成",
    step: (n: number, total: number) => `第 ${n} 步，共 ${total} 步`,
    count: (n: number, max: number) => `${n} / ${max}`,
  },
  en: {
    cancel: "Cancel",
    confirm: "OK",
    close: "Close",
    back: "Back",
    loading: "Loading",
    loadMore: "Load more",
    noMore: "No more",
    retry: "Retry",
    clear: "Clear",
    search: "Search",
    delete: "Delete",
    more: "More",
    upload: "Add image",
    remove: "Remove",
    done: "Done",
    step: (n: number, total: number) => `Step ${n} of ${total}`,
    count: (n: number, max: number) => `${n} / ${max}`,
  },
};

export type Labels = (typeof LABELS)["zh"];
