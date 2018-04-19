---
layout:     post
title:      "PHP手动搭建MVC框架（6）"
subtitle:   " 自己动手撸一个MVC框架 "
author:     "silsuer"
header-img: "img/post-bg-2015.jpg"
tags:
    - PHP
---

#### 系统配置类
   在整个网站的运行过程中，经常需要用到系统配置文件，比如说数据库配置，需要经常进行读取，所以，写一个系统配置类是必要的，在这个配置类中，我们可以动态操作配置文件，设计的时候，模仿TP的C函数，首先在公共函数中定义一个C函数，
   ``function C(){
    $conf = \S\Config::getInstance();  //获取配置类的单例
    $args = func_get_args();    //获取函数中传进来的参数
    switch (func_num_args()) {   //获取传进来的参数的个数
        case 0: //0个参数，读取全部配置
            return $conf->get();   //返回config对象的get方法结果
            break;
        case 1:   //一个参数，则为读取配置信息的值,如果是数组，为动态设置配置信息的值
            if (is_array($args[0])){
                return $conf->setAll($args[0]);   //返回config对象的setAll方法结果
            }
            return $conf->get($args[0]); //如果不是数组，就是获取该配置信息的值
            break;
        case 2:   //两个参数，为设置配置信息的值 
            return $conf->set($args[0],$args[1]);
            break;
        default:
            break;
    }
}``
首先获取配置类的单例，然后根据传入参数的个数，调用不同这个类中不同的方法，是获取还是设置信息。
###### 在配置类中实现方法：
~~~

~~~``<?php
namespace S;
class Config{
        
    //这个数组是用来存放配置值的
    private $config=[];
    //这个变量用来存放单例的
    private static $instance;

   
    public static function getInstance(){  //单例模式
        if (!(self::$instance instanceof self)) {  //判断现在的$instance是否是自身类的一个实例
            self::$instance = new self;    //如果不是的话，证明这个类从来没有实例化过，那么就实例化自己
        }
        return self::$instance;  //如果是的话，就返回这个$instance，这个类的实例，这样就能保证在整个程序运行过程中都只有一个Config类的实例，可以节约资源，这就是单例模式
    }

    /**
     * Config constructor. 构造函数 创建实例时就引入配置文件，并合并，给$config赋值
     */
    private function __construct(){  //在实例化这个类的时候 就会调用这个构造函数
        $sys_conf = [];         //系统配置数组
        $user_conf = [];   //用户配置数组
        //系统配置文件
        if (file_exists(SYS_CONFIG)){  //如果S-Framework中定义过的系统配置文件路径存在且有效的话，则把这个文件包含进来
            $sys_conf = include(SYS_CONFIG);
        }
        //用户配置文件
        if (file_exists(USER_CONFIG)){     //如果S-Framework中定义过的用户配置文件路径存在且有效的话，则把这个文件包含进来
            $user_conf = include(USER_CONFIG);
        }
        return  $this->config = array_merge($sys_conf,$user_conf); //把用户配置和系统配置合并在同一个数组里，使用户配置覆盖掉相同的系统配置，这样就实现了用户的自定义配置
    }

    /**
     * @return array  获取config文件中的数据
     */
    public function get($parm = null){   
        $value = [];
        if (isset($this->config) && empty($parm)){  //如果没有参数传进来的话，就返回整个config数组（config数组在构造函数中获得过值）
            return $this->config;
        }

        if (isset($this->config[$parm])){  //如果有参数传进来的话，就在config数组中寻找键值是这个参数的配置项，并将其返回
            return $this->config[$parm];
        }else{
            echo 'config参数错误';
        }
    }

    public function  setAll($arr){        //批量设置配置项

        if (is_array($arr)){             //如果传进来的参数是一个数组的话
            foreach ($arr as $key => $value) {   //就遍历这个数组，每遍历一个键值对，就调用一次set方法，把键与值作为参数传递进去
                $this->set($key,$value);  //使得每一个键值对都成为一个配置项，然后返回true，证明执行成功
            }
            return true;
        }else{
            return false;  //如果传进来的参数不是数组，就返回false，证明执行失败
        }
    }

    public function  set($keys,$values){        //设置配置数组的值
        $this->config[$keys] = $values;   //使传进来的两个参数的键与值对应
        return true;
    }
    } ``
    
以上就是系统配置类，现在我们重新看开始的C()函数,首先获取Config类的对象，然后根据需要调用不同的方法，达到设置与获取配置项的目的。