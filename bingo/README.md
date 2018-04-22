# 介绍


Bingo是一款使用`httprouter`作为路由的Web全栈开发框架。

受到`Laravel`的启发，将一些网站开发过程中必备的功能内置到了框架中，开箱即用

我致力于让它有着`Golang`的速度和`Laravel`的优雅

目前正在开发中......

# 快速开始

*Q : 安装Bingo本地环境，总共分几步？*

*A : 3步*

1. 安装

   ```go
          go get github.com/silsuer/bingo  // 获取并安装bingo
   ```
   
2. 初始化项目

  ```go
        bingo init  // 使用bingo提供的脚手架 初始化项目
  ```

3. 运行项目

  ```go
     go run start.go // 运行初始化后的项目
  ```
  
此时在浏览器中输入`localhost:12345`,即可看到欢迎界面！安装成功！