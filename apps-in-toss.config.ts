import { defineConfig } from '@apps-in-toss/web-framework/config';

export default defineConfig({
  appName: 'subsidy-finder',
  brand: {
    primaryColor: '#0064FF', // 화면에 노출될 앱의 기본 색상으로 바꿔주세요.
  },
  permissions: [],
  webBundleDir: 'dist',
});
