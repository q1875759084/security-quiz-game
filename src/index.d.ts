/**
 * webpack DefinePlugin 注入的全局常量
 * 构建时由 DefinePlugin 替换为字面量，浏览器运行时不存在 process.env
 * 本地：dotenv 从 .env.development 读取 DEPLOY_ENV
 * CI：由平台直接注入 DEPLOY_ENV（测试/联调/生产/泳道等）
 */
declare const __DEPLOY_ENV__: 'dev' | 'test' | 'staging' | 'production';

/**
 * SCSS 文件类型声明
 * 用于告诉 TypeScript 如何处理 .scss 文件导入
 */
declare module '*.scss' {
  const content: { [className: string]: string };
  export default content;
}

declare module '*.sass' {
  const content: { [className: string]: string };
  export default content;
}

declare module '*.css' {
  const content: { [className: string]: string };
  export default content;
}

declare module '*.module.scss' {
  const classes: { [key: string]: string };
  export default classes;
}

declare module '*.module.sass' {
  const classes: { [key: string]: string };
  export default classes;
}

declare module '*.module.css' {
  const classes: { [key: string]: string };
  export default classes;
}