---
layout:     post
title:      "PHP手动搭建MVC框架（10）"
subtitle:   " 自己动手撸一个MVC框架 "
author:     "silsuer"
header-img: "img/post-bg-2015.jpg"
tags:
    - PHP
---

#### 我们在开发中经常会用到很多的函数，有些是PHP内置的，有些需要自己去实现，为了减少代码冗余，我就自己封装了一些常用的函数，如下：

1.  C()函数
  可能ThinkPHP里最有标志性的就是它的这些大写字母的函数了吧，C函数在系统配置类中已经写过了，需要的请去前面的章节中查看
2.  I()函数
~~~
function I($a){
    $b = array_merge($_GET,$_POST);
    return $b[$a];
}
~~~
这里只是简单的把``$_GET和$_POST``合并后返回，如果需要的话也可以自己去添加过滤函数等等，这里为了方便，不再赘述

3.dump()函数
~~~
function dump($arr){
    if (is_array($arr)){
        echo '<pre>';
        print_r($arr);
        echo '</pre>';
    }else{
        echo $arr;
    }
}
~~~
这个函数主要是因为调试的时候，到处``var_dump()  print_r()``和``echo``，很乱，而且有时候因为参数类型的问题还会报错，因为echo不能打印数组类型，所以会报错，现在把他们都封装起来，方便调试（pre标签会保证把数组格式化输出，而不会连在一起，不容易看清楚）

4.import()函数：
~~~
function import($str){
    $path = C('extend_path') . $str;
    if (file_exists($path)){
        require $path;
        return true;
    }else{
        throw new \S\S_Exception('您要导入的类文件不存在！');
    }
}
~~~
这个函数用来引入第三方类库，比如我在配置文件中添加配置项如下：`` 'extend_path' => S_PATH . 'S/Extend/',`` 那么我将Smarty类放在``Extend/``路径下，这样，我只需要使用``import('Smarty.class.php')；``这样就把Smarty类包含进来了，下面就可以进行实例化等操作了

5.session()函数
~~~
function session($parm1,$parm2 = null){
    if (is_null($parm2)){
        if (isset($_SESSION[$parm1])){
            return $_SESSION[$parm1];
        }else{
            return false;
        }

    }else{
        $_SESSION[$parm1] = $parm2;
        return true;
    }
}
~~~
这个函数是为了操控session的，session比cookies更加安全，广泛用在验证码验证上，前提是要使用``session_start()``开启``session``

6.redirect()函数
~~~
function redirect($url, $time=0, $msg='') {
    $url = __ROOT__.$url;
    if (empty($msg)){
        $msg    = "系统将在{$time}秒之后自动跳转到{$url}！";
    }
    if (!headers_sent()) {
        // redirect
        if (0 === $time) {
            header('Location: ' . $url);
        } else {
            header('refresh:'.$time .';url=' . $url);
            echo($msg);
        }
        exit();
    } else {
        $str    = "<meta http-equiv=\'Refresh\' content=\'".$time .";URL=". $url . "\'>";
        if ($time != 0)
            $str .= $msg;
        exit($str);
    }
}
~~~
这个函数用与自动跳转，跟TP中的``$this->redirect()``功能一样，主要是通过设置``header()``达到跳转的目的，代码也很简单

7.isAjax、isPost、isGet函数
~~~
function isAjax(){
    if(isset($_SERVER['HTTP_X_REQUESTED_WITH']) && strtolower($_SERVER['HTTP_X_REQUESTED_WITH']) == 'xmlhttprequest'){
        return true;
    }else{
        return false;
    }
}

function isGet(){
    return $_SERVER['REQUEST_METHOD'] == 'GET' ? true : false;
}

function isPost() {
    return ($_SERVER['REQUEST_METHOD'] == 'POST'  && (empty($_SERVER['HTTP_REFERER']) || preg_replace("~https?:\/\/([^\:\/]+).*~i", "\\1", $_SERVER['HTTP_REFERER']) == preg_replace("~([^\:]+).*~", "\\1", $_SERVER['HTTP_HOST']))) ? 1 : 0;
}
~~~
这三个函数是用来判断当前提交的类型，代码来源于网络。

8.这个函数是重中之重：M()函数
~~~
function M($table_name,$dsn = null){
    if (is_null($dsn)){
        $obj = \S\Model::getInstance($table_name);
    }
    return $obj;
}
~~~
这个函数功能和TP中的M函数一样，都是用于连接数据库，这里面获取了Model类的单例，穿件来的第一个参数是表名，第二个参数是使用PDO链接数据库时的dsn，默认为空，在Model类中会从配置文件中调取dsn。
下一章就详细讲解数据库操作类Model