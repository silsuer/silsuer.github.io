---
layout:     post
title:      "PHP手动搭建MVC框架（5）"
subtitle:   " 自己动手撸一个MVC框架 "
author:     "silsuer"
header-img: "img/post-bg-2015.jpg"
tags:
    - PHP
---


###### 入口文件及核心文件
###### 还记得“我眼中的MVC”中我说过的执行流程吗？不记得的话请返回到那一章重新复习一下，执行流程和目录结构必须烂熟于心，不然继续往下看的话可能会觉得很乱哒！

##### 入口文件：
   index.php,这个没有什么可说的，单入口文件，只要引入核心文件``S-Framework.php``就可以了

``<?php
/*
 *S-Framework入口文件，直接引入初始化文件
 */
define('APP_DEBUG',true);  //可以在这里定义是否是调试模式，后面会写，调试模式就开启报错机制，
require './S/S-Framework.php';
//后面不需要任何代码，也不需要“?>”表示php文件的结束，并不建议这样做``

##### 核心文件
   这个文件就是入口文件中引入的``S-Framework.php``
   首先要写当前的命名空间，在这里我们使所有核心类库的命名空间都是S
   ``<?php
  namespace S;``

1.然后定义常量，我们需要的常量有：
          当前脚本执行的绝对路径：``S_PATH``,
          是否开启调试模式``APP_DEBUG``，
          是否是CGI模式``IS_CGI``（我们需要根据CGI设置根目录），
          是否是CLI模式``IS_CLI``
          当前网站根目录``__ROOT__``
          
          当前文件名``_PHP_FILE_``
          系统应用目录（即模块所在目录）：``APP_PATH``
          运行核心目录  ：``CORE_PATH``
         定义这些常量所需要的代码为：
         ``defined('S_PATH') or define('S_PATH',dirname($_SERVER['SCRIPT_FILENAME']).'/');//定义当前脚本的绝对路径，$_SERVER['SCRIPT_FILENAME']就是绝对路径``
         
         ``//定义是否是调试模式，并根据APP_DEBUG的值设置报错级别
         defined('APP_DEBUG') or define('APP_DEBUG', false);``
          if (APP_DEBUG==true){   //
                     error_reporting(E_ALL);
              }else{
                  error_reporting(0);
             }
             //是否是CGI模式
             define('IS_CGI',(0 === strpos(PHP_SAPI,'cgi') || false !== strpos(PHP_SAPI,'fcgi')) ? 1 : 0 );
             //是否是CLI模式
             define('IS_CLI',PHP_SAPI=='cli'? 1 : 0);
           
              if(!IS_CLI) {
    // 当前文件名
    if(!defined('_PHP_FILE_')) {
        if(IS_CGI) {
            //CGI/FASTCGI模式下
            $_temp  = explode('.php',$_SERVER['PHP_SELF']);
            define('_PHP_FILE_',rtrim(str_replace($_SERVER['HTTP_HOST'],'',$_temp[0].'.php'),'/'));
        }else {
            define('_PHP_FILE_',rtrim($_SERVER['SCRIPT_NAME'],'/'));
        }
    }
    
    //设置网站根目录
    if(!defined('__ROOT__')) {
        $_root  =   rtrim(dirname(_PHP_FILE_),'/');
        define('__ROOT__',  (($_root=='/' || $_root=='\\')?'':$_root.'/'));
    }
    //设置系统应用目录
        defined('APP_PATH') or define('APP_PATH', S_PATH . 'Application/');

    //设置系统核心目录``.
    defined('CORE_PATH') or define('CORE_PATH',S_PATH . 'S/Core/');

 2.引入系统配置类
    ``include(CORE_PATH . 'Config.php');``
    
 3.引入系统函数库
 ``include(CORE_PATH . 'Common/functions.php');``
 
 4.引入加载函数
 ``include(CORE_PATH . 'S.php');``
 
 5.执行加载函数的run方法
   ``S::run();``
   
  ###### 以上就是入口文件以及核心文件，下面从定义常量之后的操作开始讲起，第一个先讲系统配置类 Config.php,在使用系统配置类之前，需要使用引入的系统函数库中的一个函数，TP中的是C函数，所以这里我也用这个函数名 ``C()``函数，请看下一章节的介绍。