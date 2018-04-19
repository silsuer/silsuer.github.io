---
layout:     post
title:      "使用laradock搭建Laravel开发环境——windows篇"
author:     "silsuer"
header-img: "img/post-bg-e2e-ux.jpg"
tags:
    - PHP
    - Laravel
---

# 搭建laravel环境

### 一、写在前面
	- 为了实现开发环境，测试环境和生产环境的统一，避免开发时从未发现的bug在生产环境中复现，我们可以使用`docker` 来统一我们的开发环境
	
	- 对于`docker`，我们可以首先把他粗略的理解为一种类似虚拟机的程序，但是与虚拟机的内部架构完全不同
	
	- 当在电脑中安装好docker后，docker会关闭你电脑的BIOS设置中的虚拟化设置，这意味着你将无法再次使用虚拟机
	
### 二、 必要准备
	1. git环境
	
		因为我们需要使用的是一个github上的开源程序，所以首先要安装Git环境，这里不再赘述
		
	2. docker环境
	
		- 首先从docker官网[docker官网](https://store.docker.com/editions/community/docker-ce-desktop-windows "docker官网") 中下载docker的windows版本
		
		- 然后在本机上进行安装，基本上是傻瓜式操作，一路下一步即可，安装完成后，在随意一个位置，打开`git bash` ， 在终端输入 `docker --version`，如果打印出版本，证明安装成功。
		
		- 接下来需要做一件很容易忘的事...很重要....:更改docker的镜像源，毕竟有墙在挡着......具体操作在这里[注册一个daocloud帐号，并按照这里的教程去实现，很简单](http://www.daocloud.io/mirror#accelerator-doc)
		- 从`github`上下载laradock：  建立你的项目文件夹（比如名为`Code`）：
		
		  ```
		  进入Code目录，并右键开启git bash
		  在终端中执行：
		  git clone https://github.com/Laradock/laradock.git
		  ```
		  
		  然后在Code目录下，会出现一个laradock目录
		  
		- 进入laradock目录：（`cd laradock`）:首先要复制环境变量（这一点很重要，很多教程都没有提到这一点）；
		  
		  ```
		  cp env-example .env
		  ```
		  
		- 好了，现在准备工作完成了，接下来准备开启docker了
		
### 三、 开启docker
	1. 进入laradock目录，首先确定`.env`文件已经存在，然后执行
	   ```
	   // up代表开启， -d 代表后台运行，后面的参数是你要开启的功能的名字
	   docker-compose up -d nginx mysql redis phpmyadmin
	   //首次执行，docker会从远程下载所需镜像，比较慢，之后就简单了，可以在几秒钟之内开启一个环境，比虚拟机快的多
	   ```
	
	2. 进入docker控制台
		```
		//在命令行中执行
		// 使用bash 进入workspace控制台（实际上就是一个Ubuntu的终端，这里的www目录与物理机中的Code下面的文件存在映射）
		docker-compose exec workspace bash
		```
		
	3. 使用composer创建laravel项目：
		```
		// composer并不建议使用root帐号进行操作，所以我们先建立一个账户
		useradd silsuer
		//上一步我添加了一个名为silsuer的账户，现在切换到该账户
		su silsuer
		//然后又到了很重要的一步了，切换composer镜像源，罪魁祸首依旧是那道墙
		composer config -g repo.packagist composer https://packagist.phpcomposer.com
		// 接下来就可以愉快的安装了
		composer create-project laravel/laravel=5.5 blog
		// 好了，现在我们已经建立好了一个名为blog的laravel项目
		```
	4. 在浏览器中输入localhost，应该就可以看到laravel的欢迎界面了
	
### 四、 F&Q
	1. 始终注意最容易忽略的三步： 添加docker镜像源，复制.env文件,切换到普通用户并更改composer镜像源
	
	2. 在laradock中使用mysql时，要注意mysql的IP地址并不是`127.0.0.1`,而是你的mysql docker中的IP地址，具体查看方法在[官方文档](http://laradock.io/#i-get-mysql-connection-refused)中可以找到；
	
	3. docker的运行原理就是把程序运行过程中需要的软件都隔离开，比如说，你要重启nginx，就在终端中执行
	```
	// 使用bash方式进入nginx容器
	docker-compose exec nginx bash
	// 执行重启操作
	/usr/sbin/nginx -s reload
	```
		
		同理，如果要操作mysql或redis，就进入他们的容器中去操作
	
	4. 应该还有一些其他坑，我暂时能想起来的就这么多了。