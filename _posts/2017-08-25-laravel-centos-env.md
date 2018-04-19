---
layout:     post
title:      "CentOS搭建Laravel环境"
author:     “silsuer”
header-img: "img/post-bg-digital-native.jpg"
tags:
    - PHP
---


Centos搭建Laravel环境
===========

&nbsp;

>  这种方法只是一种在服务器上搭建LAMP并且安装composer以使用Laravel的方法,并不是官方推荐的方法,如果有可能,还是要使用官方推荐的Homestead方式来使用Laravel

1. 更新yum源

```
yum update
```

2. 安装Apache

```
yum install httpd -y

yum install httpd-devel
```
3. 启动apache

```
httpd -k start
```
此时访问IP地址,如果出现Apache欢迎界面,证明安装成功

4. 安装mysql

- 下载mysql的repo源

```
$ wget http://repo.mysql.com/mysql-community-release-el7-5.noarch.rpm
```
- 安装mysql-community-release-el7-5.noarch.rpm包
```
$ sudo rpm -ivh mysql-community-release-el7-5.noarch.rpm
```
安装这个包后，会获得两个mysql的yum repo源：/etc/yum.repos.d/mysql-community.repo，/etc/yum.repos.d/mysql-community-source.repo。

5. 安装mysql-sever

```
$ sudo yum install mysql-server
```
根据提示安装就可以了,不过安装完成后没有密码,需要重置密码

6. 开启mysql :
```
$ service mysqld start
```

7. 重置mysql密码

```
$ mysql -u root
```
> 登录时有可能报这样的错：ERROR 2002 (HY000): Can‘t connect to local MySQL server through socket ‘/var/lib/mysql/mysql.sock‘ (2)，原因是/var/lib/mysql的访问权限问题。下面的命令把/var/lib/mysql的拥有者改为当前用户：

```
$ sudo chown -R root:root /var/lib/mysql
```
重启mysql服务

```
$ service mysqld restart
```

8. 接下来登录重置密码：

```
$ mysql -u root //直接回车进入mysql控制台
mysql > use mysql;
mysql > update user set password=password('123456') where user='root';
mysql > exit;
```

9. 安装php7

- 安装epel-release

```
rpm -ivh http://dl.fedoraproject.org/pub/epel/7/x86_64/e/epel-release-7-5.noarch.rpm
```

- 安装PHP7的rpm源

```
rpm -Uvh https://mirror.webtatic.com/yum/el7/webtatic-release.rpm
```

- 安装PHP7(根据网上的教程,我这里没有安装php70w-xml.x86_64这个扩展,结果导致composer无法install和update,所以这里要安装下这个扩展)

```
$ yum install php70w.x86_64 php70w-cli.x86_64 php70w-common.x86_64 php70w-gd.x86_64 php70w-ldap.x86_64 php70w-mbstring.x86_64 php70w-mcrypt.x86_64 php70w-mysql.x86_64 php70w-pdo.x86_64

$ yum install php70w-fpm

$ yum -y install php70w-xml.x86_64
```

至此lamp安装完成

10. 接下来安装composer

```
sudo curl -sS https://getcomposer.org/installer | php
sudo mv composer.phar /usr/local/bin/composer
sudo chmod +x /usr/local/bin/composer
```

然后进入网站根目录,使用composer下载laravel

11. 安装Laravel框架
> 这里使用默认的apache网站目录/var/www/html

> 在安装之前应该查看phpinfo以及php.ini,确保开启了openssl,pdo,mbstring,tokenizer这四个laravel所必须的扩展

```
cd /var/www/html
sudo chmod -R 777 /var/www/html
composer create-project laravel/laravel blog --prefer-dist
cd blog
sudo chmod -R 777 storage
sudo chmod -R 777 vendor
```

12. 配置虚拟主机
- 进入Apache虚拟主机目录

```
cd /etc/httpd/conf.d
```
- 新创建一个虚拟主机配置文件，假设现有的域名为blog.com，为了方便识别，这里创建blog.conf

```
sudo touch blog.conf
```
- 编辑blog.conf

```
sudo vi blog.conf
```

- 参照以下内容输入，邮箱、域名和网站主目录根据自己的情况修改

```

ServerAdmin admin@blog.com
ServerName blog.com
ServerAlias www
DocumentRoot /var/www/html/blog/public

<Directory "/var/www/html/blog/public">
Options FollowSymLinks
AllowOverride All


```

- 输入完成保存，重启Apache

```
sudo systemctl restart httpd
```

浏览器访问你的域名测试！
> 可能会报RuntimeException错误,只要重新生成key并且替换到env文件里就可以了

13. 不要忘记安装这个php扩展,否则composer install和update将无法运行

```
[root@localhost ~]# yum -y install php70w-xml.x86_64
```

-------
安装完成!