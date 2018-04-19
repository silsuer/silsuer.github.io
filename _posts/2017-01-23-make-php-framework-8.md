---
layout:     post
title:      "PHP手动搭建MVC框架（8）"
subtitle:   " 自己动手撸一个MVC框架 "
author:     "silsuer"
header-img: "img/post-bg-2015.jpg"
tags:
    - PHP
---

#### 路由类
上一章写了运行时要执行的一些函数，设置响应头部等，接下来就要实例化路由了，这里需要一个路由类``Route``
上一章的``run()``函数的最后，实例化了路由类，下面给出路由类的详细代码：
~~~
<?php
namespace S;
class Route{
    private $module;   //当前模块
    private $controller;  //当前控制器
    private $action;    //当前方法
    public function __construct(){
        $this->parseUrl();//解析路由，获得模块，控制器和操作
        $this->newAction();   //实例化控制器，并执行对应方法
    }
    public function parseUrl(){
        $this->module = isset($_GET[C('module_name')]) ? $_GET[C('module_name')] :       C('default_module');
        $this->controller = isset($_GET[C('controller_name')]) ? $_GET[C('controller_name')] : C('default_controller');
        $this->action = isset($_GET[C('action_name')]) ? $_GET[C('action_name')] : C('default_action');
    }
    
    public function newAction(){
        $path =  APP_PATH . $this->module . '/Controller/' .$this->controller . 'Controller.php';      //把模块名和控制器名链接成字符串，作为控制器的真实文件路径
        if (file_exists($path)){    //如果这个文件存在，就通过模块名和控制器名拼接成命名空间的路径
            $controllerName = '\\' . $this->module . '\\' . $this->controller . 'Controller';
        }else{
            throw new S_Exception($controllerName . '控制器类文件不存在');
        }
        if (class_exists($controllerName)){    //然后判断这个命名空间下的类是否存在，存在的话，就实例化这个控制器类
            $controllerObj = new $controllerName;
        }else{
            throw new S_Exception($controllerName . '控制器类不存在，请检查类名或命名空间');
        }
        if (method_exists($controllerName,$this->action)){   //判断这个控制器中是否存在这个方法，如果存在的话，就执行这个方
            $controllerObj->{$this->action}();    
        }else{
            throw new S_Exception($this->action . '方法不存在');
        }
    }
}
~~~
以上就是这个路由类的代码，很好理解，首先，在核心运行类中new了一个Route类，自动调用构造函数，构造函数先调用了``parseUrl()``的解析``url``的方法，先在配置文件中添加如下配置项：
~~~
    'module_name' =>'m', //默认模块参数名  index.php?m=Home&c=Index&a=index
    'default_module' =>'Home',  //默认模块参数值
    'controller_name' =>'c',     //默认控制器参数名
    'default_controller'=>'Index',   //默认控制器参数值
    'action_name'=>'a',        //默认方法参数名
    'default_action'=>'index',     //默认方法参数值
~~~
这样，在``parseUrl``中，首先用``$_GET[]``分别获取到当前的模块、控制器、方法的值，如果url中没有，就使用默认的配置文件中的值，并把它赋值给相应的变量。
然后，构造函数又调用了``newAction()``方法，把获取到的这三个值拼接成控制器文件的字符串路径，如果这个路径对应的文件存在，那就再次根据模块名和控制器名，拼接出这个控制器的命名空间，然后去判断这个命名空间下是否存在这个类，如果存在，证明我们找到了这个类，就去实例化这个类，实例化之后，就去判断这个类中是否存在需要调用的方法，如果存在，那么就正式的去调用这个类，至此，整个PHP执行流程结束。

#### 很简单吧？其实把框架掰开了揉碎了看，就那么几个步骤，只要自己试着写写，很容易就明白的
##### 上面的代码中用到了``S_Exception``类，这是一个自定义的异常类，下一节会讲到。