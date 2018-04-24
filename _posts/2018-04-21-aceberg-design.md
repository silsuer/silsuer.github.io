---
layout:     post
title:      "Aceberg设计思路"
author:     "silsuer"
header-img: "img/post-bg-re-vs-ng2.jpg"
tags:
    - PHP
---

# Aceberg 最初构想

## 基础架构

想要写一套完整的扩展性强Web系统，快速构建各类网站以及APP

基于Lumen框架，使用前后端分离技术，后端只提供各种组件接口，前端负责视图渲染

所有功能，全部组件化，多个组件组成插件和模型

## 缺点

前端：
  1. 模版渲染速度慢，当ajax请求结束后才能开始渲染
  
  2. 页面显示不完整，多个ajax请求很容易挂掉几个，导致页面显示不完全
  
  3. 手写组件十分麻烦，原来的初衷是，抽象出来的组件可以到处使用，但是现在看来，背离初衷
  
后端：
  
  1. Lumen和Laravel一样，封装度太高，无法进行太多的细节拆解和优化
  
  2. 组件、插件、模型等无法重名，原来的每一个组件是一个文件夹，渲染到前端目录的时候，如果
  
     有重名的组件，后面的会覆盖掉前面的
     
  3. 组件、模型、插件之间的依赖关系没有一个清晰的定义，应该是组件、模型、插件都存放在各自的目录中，在目录下
  
     写一个完整的描述，描述这个组件或者插件用到了什么依赖，挂载了哪些钩子
     
  4. 由于一次完整的http请求，就是一个php程序的完整生命周期，加上php-fpm的同步阻塞的机制，导致运行速度太差
  
 所以根据最近完成的项目总结出来的经验，设立新的aceberg基础架构
 
 # Aceberg 新架构
 
 ## 基础描述
 
  1. 抛弃前后端分离的做法，使用模版渲染引擎，添加大量自定义标签，进行前端渲染
  
  2. 重新定义组件的命名规则，参考composetr的packages的命名规范
  
  3. 重新规范项目的目录结构
  
  4. 将标签，组件，插件，模型完全分离，它们之间的依赖只需要通过一个描述文件进行说明即可
  
  5. 引入Redis，将常用数据缓存在Redis中，加快访问速度
  
  5. 引入Swoole异步通讯框架，将标签、组件分别组织成一棵依赖树并保存在Redis或内存中
  
## 目录结构

  ```go
    
       aceberg                                                       // 项目根目录
         |----app                                                    //开发逻辑放置的地方
               |---Components                                        //第三方组件目录
                     |----<comp_name dir>                            // 一个组件就是一个目录
                              |----<comp_name>.php                   // 组件功能文件，当一个组件需要多个类时，<comp_name>.php 是入口类
                              |----description.json                  // 组件的描述文件，记录了组件的依赖等数据
               |---Model                                             // 第三方模型目录
                     |----<model_name> dir
                              |----<model_name>.php                  // 模型功能文件
                              |----<description>.json                // 模型描述文件
               |---Plugins                                           // 第三方插件目录
                      |----<plugin_name> dir
                              |----<plugin_name>.php                 // 插件功能文件
                              |----<description>.json                // 插件描述文件
               |---Tags                                              // 第三方模版标签目录
         |----config                                                 // 所有配置文件      
         |----core                                                   // 内置功能逻辑的目录
               |---Components                                        // 内置组件目录，内部结构同上
               |---Model                                             // 内置模型目录
               |---Plugins                                           // 内置插件目录
               |---Tags                                              // 内置模版标签目录
         |----vendor                                                 // 第三方包
         |----composer.json                                          // composer配置文件
  ```


## Laradock 安装swoole扩展

 1. 把 `laradock/.env` 文件中的 `PHP_FPM_INSTALL_SWOOLE` 设置为`true`
 
 2. 在laradock目录下执行 `docker-compose up --build -d php-fpm` 等待重新构建完成
 
 3. 重启`php-fpm`即可
 
 4. 有时候会出现在phpinfo中可以看到swoole扩展，但是在使用`php -m`中看不到安装了扩展，
 
   这可能是因为[cli/php-fpm/apache使用不同的php.ini配置](https://wiki.swoole.com/wiki/page/351.html)

   1. 确认php.ini位置
      
      在命令行中输入： `php -i|grep php.ini`
      
      找到 `php.ino` 的绝对路径
      
   2. 查看对应php.ini是否有extension=swoole.so
     
      如果没有的话，在这里的最下面添加一行 `extension=swoole.so` 
      
      重启 `php-fpm` 即可（非必需）
   
   3. 如果还是不可以的话，报没有找到`.so`文件的错误，那么就登陆 `workspace` 容器中，手动安装: `pecl install swoole`
     
## 使用Nginx进行反向代理，将80端口转发到Swoole服务器所监听的端口

nginx 配置文件:

 ```
    server {
    
        listen 80;
        listen [::]:80;
    
        server_name ace.test;
        root /var/www/Aceberg;
        index index.html index.htm;
    
        location / {
    		 proxy_redirect off;
    		 proxy_http_version 1.1;
             proxy_set_header Connection "keep-alive";
    		 proxy_set_header X-Real-IP $remote_addr;
    		  if (!-e $request_filename) {
                proxy_pass http://172.20.0.5:35335;
            }
    		 
        }
    
        location ~ \.php$ {
            try_files $uri /index.php =404;
            fastcgi_pass php-upstream;
            fastcgi_index index.php;
            fastcgi_buffers 16 16k;
            fastcgi_buffer_size 32k;
            fastcgi_param SCRIPT_FILENAME $document_root$fastcgi_script_name;
            include fastcgi_params;
        }
    
        location ~ /\.ht {
            deny all;
        }
    
        location /.well-known/acme-challenge/ {
            root /var/www/letsencrypt/;
            log_not_found off;
        }
    
        error_log /var/log/nginx/app_error.log;
        access_log /var/log/nginx/app_access.log;
    }

 ```
 
 将把端口转发到`35333`端口
 
 进入 `workspace` 控制台，php代码如下：
 
   ```php
      Class Server {
          public function __construct()
          {
              echo "开启监听... \n";
              $http = new swoole_http_server("0.0.0.0",35335);
              $http->on("request",function ($request,$response){
                 echo "一次访问！ \n";
                  $response->end("<h1>Hello Swoole. #".rand(1000, 9999)."</h1>");
              });
              $http->start();
          }
      }
      new Server();
   ```

> 执行成功后，浏览器访问，会发现刷新一次浏览器会出现打印两行 "一次访问" 的情况，是因为一次是页面的请求，一次是 `/favcoin.ico` 的请求，过滤掉即可

## 代码执行流程

启动时，在控制台运行 `php aceberg.php` :

   1. 引入 `composer` 的自动加载文件 `autoload.php`,这个函数会引入 `S-Framework.php` 文件，这个文件主要是引入各种
   
      需要的php文件的
      
   2. 在 `aceberg.php` 中的Server类的构造函数里，注册路由，注册的路由将会以数组的形式保存在内存中，
   
       > （由于php的数组本身就是哈希表的形式存储的，所以搜索速度很快，我们不需要自己定义路由存储的数据结构） 
 
   3. 实例化 `Server` 对象，执行这个对象的 `start()` 方法，开启一个 `swoole_http_server`
   
当一个请求访问时：

   1. 请求首先经过nginx，根据nginx中设置的代理端口，转发到这个端口上
   
   2. 我们的php程序监听到这个端口有数据进来，执行 `onRequest` 函数处理请求
   
   3. 首先判断请求的URL是否在路由中注册过，如果没有，返回404错误
   
   4. 如果存在这个路由，那么执行路由类的 `handle` 方法，传入 `$request` 和 `$response`
   
   5. handle方法将实例化挂载在这个路由上的控制器，然后调用控制器中指定的方法
   
   6. 在这个方法中可以渲染输出，可以执行逻辑（反正MVC就对了）
   
   7. 这个方法返回一个数据，可以是字符串，可以是数组，可以是对象，如果是字符串，会被直接响应回去，如果是数组或者对象，会被响应成字符串


## 数据库

  1. 继续沿用了 `Laravel` 内置的 ` Eloquent ORM` 来操作数据库，具体教程[看这里](https://laravel.com/docs/5.5/eloquent)
  
  2. 与在 `Laravel` 中使用只有一点点不同：
  
     1. 使用是要`use`的类不同，Laravel中使用门面，而我们要 `use Illuminate\Database\Capsule\Manager as DB;` 
     
     2. 引入并重命名为`DB`后,可以使用 `$res = DB::table('test')->get();` 调用数据库了，但是建表语句稍有不同:
     
        ```php
            DB::schema()->create("aaa",function (Blueprint $table){
                  $table->increments("id");
                  $table->string("name");
                  $table->integer("age");
               });
        ```
        
## 会话管理

   1. 使用 `session` :
      
      有两种session存储方式:（分别设置SESSION_DRIVER为REDIS或ARRAY）
      
      一种是存储在redis中，此时规定使用3号库
      
      另一种是以全局数组的形式存储在$_SESSION中
      
      使用方式：
      
        ```php
          session($request,$key);  // 读取一个session的值
          session($request,$key,$value);  // 将设置$key的值为$value
        ```
   2. 使用 `cookie`:
   
       此处我没有做任何封装，使用 `swoole` 自带的就足够了，使用方式：
       
       ```php
              // 与php的setCookie方法完全相同
              $response->cookie($name, $value, time() +60);  
              // 使用 rawCookie 可以忽略掉swoole底层对valuews的转码
              $response->rawCookie($name, $value, time() + 60);  
       ```
        
