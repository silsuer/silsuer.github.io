---
layout:     post
title:      "使用laradock搭建Laravel开发环境——mac篇"
author:     "silsuer"
header-img: "img/post-bg-e2e-ux.jpg"
tags:
    - PHP
    - Laravel
---

基于LaraDock创建Laravel环境--mac版本
==================

准备:
git环境
docker环境

1. 安装docker-compose
2. 安装LaraDock

```git clone https://github.com/LaraDock/laradock.git
```

3. 将环境文件复制出来
```
cp env-example .env
```

4. 开始构建docker容器
```
docker-compose up -d nginx mysql redis
```

5. 进入`workspace`中安装Laravel

```
docker-compose exec workspace bash //通过bash登录workspace

useradd yourname //建立一个新的账户(因为composer不允许使用root权限执行安装等操作)
su yourname //切换至非root账户
composer config -g repo.packagist composer https://packagist.phpcomposer.com //将composer的源切换至国内镜像
composer create-project laravel/laravel project_name //创建新项目
```

6. 或者直接把复制一个本地的laravel项目到和laradock父级目录中,laradock将会自动映射