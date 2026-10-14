import { View } from "@tarojs/components";
import { AppearanceSettings, TabBar, XxdPage } from "@xxd/mini";
import { TABS } from "../../tabs";

export default function Settings() {
  return (
    <XxdPage tabBar>
      <View style="padding-top:16px">
        <AppearanceSettings />
      </View>
      <TabBar items={TABS} value="settings" />
    </XxdPage>
  );
}
