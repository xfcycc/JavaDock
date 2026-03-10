/**
 * 默认命令模板与配置工厂函数
 * @author caiguoyu
 * @date 2026/3/10
 * 占位符说明：
 *   {cwd}      - 项目根目录
 *   {port}     - 服务端口
 *   {name}     - 服务名称
 *   {logPath}  - 日志文件路径
 *   {JAVA_HOME} - Java 安装路径（来自环境变量配置）
 */
import { AppConfig, DefaultCommands } from './types';

export const DEFAULT_COMMANDS: DefaultCommands = {
  'java.start': 'java -jar target/*.jar',
  'java.restart': 'java -jar target/*.jar',
  'java.build': 'mvn clean package -DskipTests',
};

/** 生成一份带有默认值的空白配置 */
export function createDefaultConfig(): AppConfig {
  return {
    environments: [],
    defaultCommands: { ...DEFAULT_COMMANDS },
    customScripts: [],
    javaServices: [],
  };
}
