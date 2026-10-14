// 选图上传：图片宫格 + 一个「添加」格子；每张图上有上传进度、出错可以重试、右上角移除。
// 选图用 chooseMedia；怎么上传由你给的 upload 决定（传到你自己的服务器），这里只管界面和状态。
import { Image, View, Text } from "@tarojs/components";
// 按名字导入 API：Taro 编 H5 时只改写它自己处理过的源码里的 Taro.xxx，组件库在 node_modules 里，默认导出上没有这些 API
import { chooseMedia, previewImage } from "@tarojs/taro";
import { ImagePlus, RotateCcw, X } from "@xxd/icons/each";
import { useRef } from "react";
import "../styles/uploader.mini.css";
import "../styles/card.mini.css";
import { a11y } from "./aria";
import { Icon } from "./icon";
import { useXxd } from "./provider";
import { cx, imgAlt, mods, nextId } from "./util";

export interface UploadItem {
  id: string;
  /** 本机临时路径（刚选的）或者上传后的地址 */
  url: string;
  status: "uploading" | "done" | "error";
  /** 0–100 */
  progress?: number;
}

export interface UploaderProps {
  value: UploadItem[];
  onChange: (items: UploadItem[]) => void;
  /** 最多几张，缺省 9 */
  max?: number;
  /** 上传一张：返回上传后的地址；onProgress 报进度（0–100） */
  upload?: (path: string, onProgress: (percent: number) => void) => Promise<string>;
  columns?: number;
  className?: string;
}

export function Uploader({ value, onChange, max = 9, upload, columns = 3, className }: UploaderProps) {
  const { t } = useXxd();
  // 上传的回调会晚到：每次都基于最新的列表改（存在 ref 里），不会把刚删掉的又加回来
  const latest = useRef(value);
  latest.current = value;
  const patch = (id: string, change: Partial<UploadItem> | null) => {
    const list = latest.current;
    if (!list.some((i) => i.id === id)) return;
    latest.current = change ? list.map((i) => (i.id === id ? { ...i, ...change } : i)) : list.filter((i) => i.id !== id);
    onChange(latest.current);
  };
  const run = (item: UploadItem) => {
    if (!upload) return;
    upload(item.url, (p) => patch(item.id, { progress: p }))
      .then((url) => patch(item.id, { url, status: "done", progress: 100 }))
      .catch(() => patch(item.id, { status: "error" }));
  };
  const add = async () => {
    try {
      const res = await chooseMedia({ count: max - value.length, mediaType: ["image"], sizeType: ["compressed"] });
      const items: UploadItem[] = res.tempFiles.map((f) => ({ id: nextId("upload"), url: f.tempFilePath, status: upload ? "uploading" : "done", progress: 0 }));
      latest.current = [...latest.current, ...items];
      onChange(latest.current);
      items.forEach(run);
    } catch {
      /* 取消了 */
    }
  };
  return (
    <View className={cx("xxd-uploader", "xxd-image-grid", className)} style={`--grid-cols:${columns}`}>
      {value.map((item, i) => (
        <View key={item.id} className={cx("xxd-image-grid__cell", "xxd-uploader__item", mods({ status: item.status }))}>
          <Image
            className="xxd-image-grid__img"
            src={item.url}
            mode="aspectFill"
            onClick={() => previewImage({ urls: value.map((v) => v.url), current: item.url }).catch(() => {})}
            {...imgAlt(`${i + 1}`)}
            {...a11y({ role: "button", label: `${i + 1}` })}
          />
          {item.status === "uploading" && (
            <View className="xxd-uploader__veil" {...a11y({ role: "progressbar", label: t.loading, valuenow: Math.round(item.progress ?? 0), valuemin: 0, valuemax: 100 })}>
              <Text>{Math.round(item.progress ?? 0)}%</Text>
            </View>
          )}
          {item.status === "error" && (
            <View className="xxd-uploader__veil is-error" hoverClass="is-hover" onClick={() => (patch(item.id, { status: "uploading", progress: 0 }), run(item))} {...a11y({ role: "button", label: t.retry })}>
              <Icon icon={RotateCcw} />
              <Text>{t.retry}</Text>
            </View>
          )}
          <View className="xxd-uploader__remove" hoverClass="is-hover" onClick={() => patch(item.id, null)} {...a11y({ role: "button", label: t.remove })}>
            <Icon icon={X} size={12} />
          </View>
        </View>
      ))}
      {value.length < max && (
        <View className="xxd-image-grid__cell xxd-uploader__add" hoverClass="is-hover" onClick={add} {...a11y({ role: "button", label: t.upload })}>
          <View className="xxd-uploader__add-inner">
            <Icon icon={ImagePlus} size={22} />
            <Text>{`${value.length} / ${max}`}</Text>
          </View>
        </View>
      )}
    </View>
  );
}
