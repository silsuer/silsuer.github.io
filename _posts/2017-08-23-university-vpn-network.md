---
layout:     post
title:      "使用Softether+openVPN绕过校园网限制"
subject:    "伪装DNS报文"
author:     “silsuer”
header-img: "img/post-bg-digital-native.jpg"
tags:
    - PHP
---


使用Softether+openVPN绕过校园网限制
========================

#### 参考资料：
 - https://www.bennythink.com/udp53.html
 - http://www.pcrooms.com/post/softether-vpn.html

#### 所需工具：
 - 一台服务器（我用的是CentOS阿里云服务器）
 - 一个像我一样聪明的脑子

#### 原理
 转自https://www.bennythink.com/udp53.html  ：
 在连接到某个需要Web认证的热点之前，我们已经获得了一个内网IP，此时，如果我们访问某个HTTP网站，网关会对这个HTTP响应报文劫持并篡改，302重定向给我们一个web认证界面（所以点HTTPS的网站是不可能跳转到web认证页面的）。详细原理可以[戳这里](http://www.ruijie.com.cn/fw/wt/36502) 我们看到了，网关（或者说交换机）都默认放行DHCP 和DNS报文，也就是UDP53与UDP 67。有些网关甚至不会报文进行检查，这也就意味着任何形式的数据包都可以顺畅通过。既然如此，我们就可以在公网搞一台服务器，然后借此来免费上网，顺便还能防止网络审计——再一次画了删除线的"免费"，其实只是把钱花在服务器上了。我们这次免费上网的主要突破点就是UDP 53，当然了，据一位朋友实践，UDP 67也可以绕过Web认证，甚至是那些UDP 53无法绕过的热点。当然啦，TCP 53也行，毕竟DNS也有TCP的。

 简单的说，就是通过服务器把正常数据包转换成校园网网关可放行的数据包


#### 检测环境
因为要使用此种方式绕过校园网限制的话，那么校园网的网关就必须允许放行DNS报文，我们才能伪装报文绕过重定向。

网上有人提供了一个工具用来检测结果，使用python写的，主要用途就是检测网关是放行了UDP53的所有数据包还是仅仅是DNS报文

##### [项目地址](https://github.com/BennyThink/UDP53-Filter-Type)

从仓库中下载好源码后，进入项目文件夹，
 - Linux用户运行`python UDP53.py`
 - Windows用户直接运行`upd.exe`

当你获得如下结果时，恭喜你，免费蹭网有望了

![img](http://ov56xbfbe.bkt.clouddn.com/QQ%E5%9B%BE%E7%89%8720170823223109.jpg)

#### 搭建服务端Softether
Softether是一个搭建VPN的神器，官网地址（需要梯子）：http://www.softether-download.com/cn.aspx?product=softether

SSH连接到服务器：
先安装gcc等编译工具
 - CentOS系统使用
   ```
   yum update
   yum groupinstall "Development Tools"  
   yum install -y gcc g++ kernel-devel  
   ```
 - Ubuntu系统使用
   ```
   sudo apt-get update
   sudo apt-get install build-essential
   ```

假设当前目录为/root

32位执行这个：
```
wget http://oks2t4o68.bkt.clouddn.com/softether-vpnserver-v4.22-9634-beta-2016.11.27-linux-x86-32bit.tar.gz
```

64位执行这个：
```
wget http://oks2t4o68.bkt.clouddn.com/softether-vpnserver-v4.22-9634-beta-2016.11.27-linux-x64-64bit.tar.gz
```

解压缩
```
tar zxvf softether-vpnserver-v4.22-9634-beta-2016.11.27-linux-x64-64bit.tar.gz
```

进入目录并编译
```
cd vpnserver
make
```

连续输入三个1后安装完成，每次贴图都要先传到七牛上再引入...就不贴截图了....

在终端中开启Softether
```
./vpnserver start
```

设置Softether服务
```
//开启服务
./vpnserver start
//关闭服务
./vpnserver stop
```

需要简单配置服务
```
./vpncmd
```

一次输入1，回车、回车、回车，然后在提示符下输入：`ServerPasswordSet`

输入管理服务器的密码

输入两次确认后按`ctrl+c`退出管理终端

PS：可以将命令写到开机启动项中，这样重启之后就不必手动开启了
```
//打开开机启动项的配置文件
vi /etc/rc.local
//在exit 0 之前写入路径：
/root/vpnserver/vpnserver start
//保存退出
！wq
```

#### 管理服务

设置好账号密码之后，我们就可以切换到带有图形界面的设备上配置服务器啦！考虑到Windows用户居多，在此我们就以Window为例进行讲解（其他版本官网也有下载）。

 1. [点此下载Softether管理软件](http://oks2t4o68.bkt.clouddn.com/softether-vpn_admin_tools-v4.22-9634-beta-2016.11.27-win32.zip)

 2. 点击新设置，设置名称、主机名（IP就是你的服务器的IP）、管理密码（服务器的管理密码），点确定。

 3. 之后选择刚刚新建的设置，点击连接按钮，来到主界面 ![img](http://ov56xbfbe.bkt.clouddn.com/QQ%E6%88%AA%E5%9B%BE20170823225703.png)

 4. 可以使用默认的HUB，也可以新建一个自己的HUB

 5. 创建用户：点【管理虚拟HUB】，然后点击【管理用户】，创建一个用户，自由度很高，甚至以后可以卖.....帐号???

 6. 在【虚拟HUB】界面中点击【虚拟NAT和虚拟DHCP服务器】，然后开启`SecureNAT`，接着点击`SecureNAT配置`，看看配置有没有哪里有问题的，我的是默认的DNS服务器地址有问题，和默认的网关一样，然后我改成了`114.114.114.114`就可以了 ![img](http://ov56xbfbe.bkt.clouddn.com/QQ%E6%88%AA%E5%9B%BE20170823230439.png)

 7. 请一定要注意，SecureNAT和Local Bridge（本地桥）不可以同时开启！否则会造成链路层死循环占用大量CPU

 8. 主界面点击L2TP，勾选全部选项，设置一个预共享密钥（当成WiFi密码随意设置）。 ![img](http://ov56xbfbe.bkt.clouddn.com/112715_0834_SoftEtherVP13.png)

 9. (这是使用L2TP连接的方法，使用openVPN的请跳过此步骤) 连接方法（Windows），首先按照常理设置好一个VPN连接，连接属性，协议选择L2TP/IPSec，高级设置里选择"预共享密钥"，输入密钥确定即可

 10. 接下来准备生成openVPN的配置文件，在刚刚的主界面中点击【OpenVPN/MS-SSTP设置】，将端口号设置为53，然后点击【为OpenVPN生成配置文件】，保存好生成的zip文件 ![img](https://o51bfbumd.qnssl.com/wp-content/uploads/2016/05/052216_0640_UDP53DNS2.png)

 11. 然后在自己的电脑或者手机上安装 openVPN 这个软件
    - Windows系统： 打开上一步生成的`zip`文件，将其中以`l3`结尾的那个文件，复制到openVPN安装目录下的config文件夹中
    - android系统： 将以`l3` 结尾的配置文件放在SD卡中，然后打开 `openVPN`，点击右上角，将这个文件从SD卡中import进来，然后输入步骤5中设置好的帐号密码

 12. 连接校园网，打开 openVPN，点击`connect`，如果出现下面的状况，证明连接成功

    ![img](http://ov56xbfbe.bkt.clouddn.com/201708232321%E6%88%AA%E5%9B%BE.png)
    ![img](http://ov56xbfbe.bkt.clouddn.com/QQ%E5%9B%BE%E7%89%8720170823231907.png)

 13. 可以吹一波了

#### 资源
 - Windows版openVPN下载链接：http://ov56xbfbe.bkt.clouddn.com/64.zip
 - android版openVPN下载链接：http://ov56xbfbe.bkt.clouddn.com/net.openvpn.openvpn.zip
 - ios与mac的请自行百度

#### 后续

嗯..........不多说了，直接上图，且行且珍惜........

![img](http://ov56xbfbe.bkt.clouddn.com/QQ%E6%88%AA%E5%9B%BE20170823232217.png)
