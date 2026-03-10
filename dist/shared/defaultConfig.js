"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DEFAULT_COMMANDS = void 0;
exports.createDefaultConfig = createDefaultConfig;
exports.DEFAULT_COMMANDS = {
    'java.start': 'java -jar target/*.jar',
    'java.restart': 'java -jar target/*.jar',
    'java.build': 'mvn clean package -DskipTests',
};
/** 生成一份带有默认值的空白配置 */
function createDefaultConfig() {
    return {
        environments: [],
        defaultCommands: { ...exports.DEFAULT_COMMANDS },
        customScripts: [],
        javaServices: [],
    };
}
//# sourceMappingURL=defaultConfig.js.map