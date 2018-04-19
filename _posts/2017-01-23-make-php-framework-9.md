---
layout:     post
title:      "PHP手动搭建MVC框架（9）"
subtitle:   " 自己动手撸一个MVC框架 "
author:     "silsuer"
header-img: "img/post-bg-2015.jpg"
tags:
    - PHP
---

#### 自定义异常类
PHP自带的异常类不太容易懂，而且对于强迫症来说提示的也不够明显，有时候需要详细信息的时候需要连续调用多个方法，所以把这些方法封装起来也是必要的，封装自定义异常类的方法很简单，只需要继承一下PHP原生的异常类，再把其中的方法封装一下就好。
~~~
<?php
namespace S;
class S_Exception extends \Exception
{
    public function __construct($message, $code = 0)
    {
        // 确保所有变量都被正确赋值
        parent::__construct($message, $code);
    }
    public function getDetail(){
        if (APP_DEBUG === true){
            $this->getDetails();
        }else{
            echo "出错了!";
        }
    }
    public function getDetails()
    {
        echo '<h1>出现异常了！</h1>';
        $msg = '<p>错误内容：<b>' . $this->getMessage() . '</b></p>';
        $msg .= '<p>异常抛出位置：<b>' . $this->getFile() . '</b>，第<b>' . $this->getLine() . '</b>行</p>';
        $msg .= '<p>异常追踪信息：<b>' . $this->getTraceAsString() . '</b></p>';

        echo $msg;
        echo '<hr>';
        echo '<pre>';
        print_r($this->getTrace()) ;
        echo '</pre>';
        exit;
    }
}
~~~
相信各位对异常类都不陌生，这里只简单提一提，首先判断是否是调试模式，如果不是，就不抛出异常，如果是的话，就按照自定义的格式输出异常信息，里面遇到的方法``$this->getFile()``是获取出现异常的文件，``$this->getMessage()``是获取异常信息，`` $this->getTraceAsString()``是获取异常追踪信息，把它们按照自己规定的格式显示出来，如果你喜欢，甚至可以给他们加上css或者一些特效。

* * * * *
下一章节会讲一些我经常用到的函数，我把他们封装到了一起，写进了框架的公共函数库文件中。