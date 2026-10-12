// React 版演示（@xxd/react）。函数名 = 原生组件名 + "Demo"；组件页会自动并排展示，源码也从这里抽取。
import { useState } from "react";
import {
  Badge,
  Banner,
  Breadcrumbs,
  Button,
  ButtonGroup,
  Checkbox,
  ClipboardText,
  Collapsible,
  Combobox,
  Dialog,
  DialogActions,
  DropdownMenu,
  Empty,
  Icon,
  Input,
  LayerCard,
  Link,
  Loader,
  Meter,
  Pagination,
  Popover,
  Radio,
  Select,
  Slider,
  Switch,
  Table,
  Tabs,
  TagInput,
  Text,
  Toasty,
  Tooltip,
  TooltipProvider,
  useKumoToastManager,
} from "@xxd/react";

export function TextDemo() {
  return (
    <div className="grid gap-1">
      <Text variant="heading2">外观</Text>
      <Text variant="secondary">只影响这个插件</Text>
    </div>
  );
}

export function ButtonDemo() {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button variant="primary">写入 X</Button>
      <Button>保存草稿</Button>
      <Button variant="ghost">稍后</Button>
      <Button variant="outline">导出</Button>
      <Button variant="destructive">删除</Button>
      <Button loading>正在生成…</Button>
    </div>
  );
}

export function LinkDemo() {
  return <Link href="#">改为新建一篇</Link>;
}

export function ButtonGroupDemo() {
  return (
    <ButtonGroup>
      <Button size="sm">左</Button>
      <Button size="sm">中</Button>
      <Button size="sm">右</Button>
    </ButtonGroup>
  );
}

export function FieldDemo() {
  return (
    <div className="grid w-72 gap-4">
      <Input label="标题" placeholder="给这篇文章起个名字" description="最多 100 个字" />
      <Input label="邮箱" defaultValue="not-an-email" error="请输入有效的邮箱地址" />
    </div>
  );
}

export function SelectDemo() {
  const [value, setValue] = useState("high");
  return (
    <Select
      label="图片质量"
      className="w-48"
      value={value}
      onValueChange={(v) => setValue((v as string) ?? "high")}
      items={{ high: "高", standard: "标准" }}
    />
  );
}

export function SwitchDemo() {
  const [on, setOn] = useState(true);
  return <Switch label="完成音效" checked={on} onCheckedChange={setOn} />;
}

export function CheckboxDemo() {
  const [on, setOn] = useState(true);
  return <Checkbox label="智能标点" checked={on} onCheckedChange={setOn} />;
}

export function RadioDemo() {
  const [value, setValue] = useState("one");
  return (
    <Radio.Group legend="写入方式" value={value} onValueChange={(v) => setValue(v as string)}>
      <Radio.Item label="只写这一篇" value="one" />
      <Radio.Item label="全部写入" value="all" />
    </Radio.Group>
  );
}

export function RangeDemo() {
  return <Slider label="同时生成" defaultValue={2} min={1} max={4} className="w-60" />;
}

export function TagInputDemo() {
  return <TagInput className="w-72" defaultValue={["海报"]} placeholder="回车添加" />;
}

const accents = ["墨色", "X 蓝", "湖蓝", "苔绿"];
export function ComboboxDemo() {
  const [value, setValue] = useState<string | null>("湖蓝");
  return (
    <Combobox value={value} onValueChange={(v) => setValue(v as string | null)} items={accents}>
      <Combobox.TriggerInput placeholder="输入筛选" />
      <Combobox.Content>
        <Combobox.Empty />
        <Combobox.List>
          {(item: string) => (
            <Combobox.Item key={item} value={item}>
              {item}
            </Combobox.Item>
          )}
        </Combobox.List>
      </Combobox.Content>
    </Combobox>
  );
}

export function TabsDemo() {
  return (
    <Tabs
      variant="underline"
      tabs={[
        { value: "write", label: "写作" },
        { value: "history", label: "记录" },
        { value: "settings", label: "设置" },
      ]}
      selectedValue="write"
    />
  );
}

export function SegmentedDemo() {
  return (
    <Tabs
      variant="segmented"
      tabs={[
        { value: "text", label: "文本" },
        { value: "image", label: "图片" },
      ]}
      selectedValue="text"
    />
  );
}

export function BreadcrumbsDemo() {
  return (
    <Breadcrumbs>
      <Breadcrumbs.Link href="#">设置</Breadcrumbs.Link>
      <Breadcrumbs.Separator />
      <Breadcrumbs.Current>外观</Breadcrumbs.Current>
    </Breadcrumbs>
  );
}

export function PaginationDemo() {
  const [page, setPage] = useState(1);
  return <Pagination page={page} setPage={setPage} perPage={10} totalCount={90} />;
}

export function DialogDemo() {
  return (
    <Dialog.Root>
      <Dialog.Trigger render={(p) => <Button {...p}>打开</Button>} />
      <Dialog className="p-6">
        <Dialog.Title className="text-lg font-semibold">写入哪篇文章？</Dialog.Title>
        <Dialog.Description className="mt-2 text-kumo-subtle">默认不会替换已有内容。</Dialog.Description>
        <DialogActions className="mt-6">
          <Dialog.Close render={(p) => <Button variant="ghost" data-xxd-cancel {...p}>取消</Button>} />
          <Dialog.Close render={(p) => <Button variant="primary" {...p}>写入为新文章</Button>} />
        </DialogActions>
      </Dialog>
    </Dialog.Root>
  );
}

export function MenuDemo() {
  return (
    <DropdownMenu>
      <DropdownMenu.Trigger render={<Button>更多</Button>} />
      <DropdownMenu.Content>
        <DropdownMenu.Item>重命名</DropdownMenu.Item>
        <DropdownMenu.Item>复制 Markdown</DropdownMenu.Item>
        <DropdownMenu.Separator />
        <DropdownMenu.Item variant="danger">删除</DropdownMenu.Item>
      </DropdownMenu.Content>
    </DropdownMenu>
  );
}

export function PopoverDemo() {
  return (
    <Popover.Root>
      <Popover.Trigger render={<Button />}>这是什么？</Popover.Trigger>
      <Popover.Portal>
        <Popover.Positioner>
          <Popover.Popup>
            <Popover.Arrow />
            <Popover.Title>主色</Popover.Title>
            <Popover.Description>会被自动提亮或加深，保证在亮暗两种纸上都看得清。</Popover.Description>
          </Popover.Popup>
        </Popover.Positioner>
      </Popover.Portal>
    </Popover.Root>
  );
}

export function TooltipDemo() {
  return (
    <TooltipProvider>
      <Tooltip content="搜索 ⌘F" render={<Button shape="square" aria-label="搜索" icon={<Icon name="Search" />} />} />
    </TooltipProvider>
  );
}

function ToastButton() {
  const toasts = useKumoToastManager();
  return <Button onClick={() => toasts.add({ title: "已保存草稿" })}>弹个 toast</Button>;
}
export function ToastDemo() {
  return (
    <Toasty>
      <ToastButton />
    </Toasty>
  );
}

export function BadgeDemo() {
  return (
    <div className="flex gap-2">
      <Badge variant="secondary">草稿</Badge>
      <Badge variant="success">已写入</Badge>
      <Badge variant="warning">待更新</Badge>
    </div>
  );
}

export function BannerDemo() {
  return <Banner variant="alert" title="今天还能写入 1 篇" description="明天 0 点恢复。" />;
}

export function EmptyDemo() {
  return <Empty title="还没有记录" description="写入 X 的文章会出现在这里。" />;
}

export function ProgressDemo() {
  return (
    <div className="grid w-72 gap-4">
      <Meter label="今天的写入" value={60} customValue="3 / 5" />
      <Loader />
    </div>
  );
}

export function TableDemo() {
  return (
    <Table>
      <Table.Header>
        <Table.Row>
          <Table.Head>插件</Table.Head>
          <Table.Head>用户</Table.Head>
        </Table.Row>
      </Table.Header>
      <Table.Body>
        <Table.Row>
          <Table.Cell>长文发布</Table.Cell>
          <Table.Cell>2,410</Table.Cell>
        </Table.Row>
        <Table.Row>
          <Table.Cell>批量存图</Table.Cell>
          <Table.Cell>5,102</Table.Cell>
        </Table.Row>
      </Table.Body>
    </Table>
  );
}

export function CollapsibleDemo() {
  const [open, setOpen] = useState(false);
  return (
    <Collapsible.Root open={open} onOpenChange={setOpen}>
      <Collapsible.DefaultTrigger>为什么默认直角？</Collapsible.DefaultTrigger>
      <Collapsible.DefaultPanel>
        <Text>会员站的硬规则：对话框、卡片、按钮、输入框都不许圆角。</Text>
      </Collapsible.DefaultPanel>
    </Collapsible.Root>
  );
}

export function CodeDemo() {
  return <ClipboardText text="pnpm xxd new ~/js/插件-今日待办" />;
}

export function CardDemo() {
  return (
    <LayerCard className="w-72">
      <LayerCard.Secondary>下一步</LayerCard.Secondary>
      <LayerCard.Primary>用小小东 UI 做第一个插件</LayerCard.Primary>
    </LayerCard>
  );
}
