---
layout:     post
title:      "PHP手动搭建MVC框架（7）"
subtitle:   " 自己动手撸一个MVC框架 "
author:     "silsuer"
header-img: "img/post-bg-2015.jpg"
tags:
    - PHP
---

#### 核心运行类
现在我们已经有了配置类，至于配置文件中有什么样的键值对，我们可以边做，需要时再去定义，这相当于我们的准备工作，现在我们可以开始继续顺着我们的执行流程继续做啦~

接下来我们要做的是核心运行类``S.php``,在前面我写过的``入口文件及核心文件``的最后，是引入核心运行类，并执行这个类的run方法
~~~

 4.引入加载函数
 ``include(CORE_PATH . 'S.php');``
 
 5.执行加载函数的run方法
   ``S::run();``
~~~
下面开始写这个核心运行类``S.php``：
（先贴出全部代码，再进行详细解释）
~~~
<?php
namespace S;
class S{
    private static $prefixes = [];
    public  static function run(){
        //应该做的是：设置字符集，系统类映射，自动加载注册方法，实例化路由
        self::setHeader();
        self::getMapList();
        spl_autoload_register('self::s_autoload');
        try{
            new Route();
        }catch (Exception $e){
            $e->getDetail();
        }
    }
    private static function setHeader(){
        header("Content-type:text/html;Charset=".C('default_charset'));
        date_default_timezone_set(C('default_timezone'));
    }
    public static function addNamespace($prefix, $base_dir, $prepend = false)
    {
        //格式化命名空间前缀，以反斜杠结束（去除两侧的反斜杠，只在最后加一个反斜杠）
        $prefix = trim($prefix, '\\') . '\\';
        //格式化基目录以正斜杠结尾，DIRECTORY_SEPARATOR是系统常量，目录分隔符，把基目录右侧斜杠去掉，换成系统支持的斜杠，然后最后统一为正斜杠
        $base_dir = rtrim($base_dir, '/') . DIRECTORY_SEPARATOR;
        $base_dir = rtrim($base_dir, DIRECTORY_SEPARATOR) . '/';
        //初始化命名空间前缀数组
        //如果前缀已存在数组中则跳过，否则存入数组
        if (isset(self::$prefixes[$prefix]) === false) {
            self::$prefixes[$prefix] = [];
        }
        if ($prepend) {
            //命名空间前缀相同时，后增基目录（array_unshift() 函数用于向数组插入新元素。新数组的值将被插入到数组的开头。）
            array_unshift(self::$prefixes[$prefix], $base_dir);
        } else {
            //前增，向数组尾部增加值
            array_push(self::$prefixes[$prefix], $base_dir);
        }
    }


    private static function getMapList()
    {
        //实例化Config类，执行get函数，获取到namespace_map_list的值，循环更改$prefixes的值
        foreach (Config::getInstance()->get('namespace_map_list') as $key => $value) {
            self::addNamespace($key, $value);
        }
    }

    private static function s_autoload($className){
        // 当前命名空间前缀
        $prefix = $className;
        //从后面开始遍历完全合格类名中的命名空间名称，来查找映射的文件名
        //strpos获取参数2在参数1中最后出现的位置，substr截取字符串
        while (false !== $pos = strrpos($prefix, '\\')) {
            // 命名空间前缀
            $prefix = substr($className, 0, $pos + 1);
            // 相对的类名
            $relative_class = substr($className, $pos + 1);
            //尝试加载与映射文件相对的类
            $mapped_file = self::loadMappedFile($prefix, $relative_class);
            //  var_dump($mapped_file);
            if ($mapped_file) {
                return $mapped_file;
            }
            //去除前缀的反斜杠
            $prefix = rtrim($prefix, '\\');
        }
        return false;
    }
    private static function loadMappedFile($prefix, $relative_class)
    {
        //这个命名空间前缀是否存在基本的目录？
        if (isset(self::$prefixes[$prefix]) === false) {
            return false;
        }
        $relative_class = str_replace('\\', '/', $relative_class);
        foreach (self::$prefixes[$prefix] as $base_dir) {
            $file = $base_dir . $relative_class . '.php';
            // 如果映射文件存在就加载它
            if (self::requireFile($file)) {
                return true;
            }
        }
        return false;
    }
    private static function requireFile($file)
    {
        if (file_exists($file)) {
            include $file;
            return true;
        }
        return false;
    }
}
~~~
好了，现在进行详细解释：
首先，我们执行的是这个类的run方法：
~~~
 public  static function run(){
        self::setHeader();   //执行本类的setHeader方法，该方法用于设置字符集
        self::getMapList();  //然后执行getMapList方法，用来把命名空间的路径映射为真实目录路径
        spl_autoload_register('self::s_autoload');  //自动加载函数，当需要实例化一个没有找到的类时，就会调用本类的s_autoload方法
        try{
            new Route();          //实例化路由，这个类用于解析URL
        }catch (Exception $e){
            $e->getDetail();
        }
    }
~~~
下面开始详细讲解里面用到的方法
setHeader方法
~~~
 private static function setHeader(){
     //设置默认字符集，这里用到了上一章我们定义的C函数，获取到了配置项‘default_charset’的值
        header("Content-type:text/html;Charset=".C('default_charset'));
        //设置默认时区，这个设置主要就是影响时间函数中取得的结果
        date_default_timezone_set(C('default_timezone'));
    }
~~~
header()函数是一个非常重要的函数，用于设置响应头部，比如我们在配置文件中加入配置项``'default_charset'=>'UTF-8',``那么当我们通过网址访问网站，所获得的响应就会使用uft8进行编码，如果网页中的字符集设置的是GBK的话，那么就会出现乱码，所以指定一个统一的字符集是非常必要的。
date_default_timezone_set()设置时区，这里在配置文件中添加配置项``'default_timezone'=>'PRC'``,表示默认时区是中国时区

* * * * *
接下来是``getMapList()``方法：
~~~
 private static function getMapList()
    {
        //实例化Config类，执行get函数，获取到namespace_map_list的值，循环更改$prefixes的值
        foreach (Config::getInstance()->get('namespace_map_list') as $key => $value) {
            self::addNamespace($key, $value);
        }
    }
    
   public static function addNamespace($prefix, $base_dir, $prepend = false)
    {
        //格式化命名空间前缀，以反斜杠结束（去除两侧的反斜杠，只在最后加一个反斜杠）
        $prefix = trim($prefix, '\\') . '\\';
        //格式化基目录以正斜杠结尾，DIRECTORY_SEPARATOR是系统常量，目录分隔符，把基目录右侧斜杠去掉，换成系统支持的斜杠，然后最后统一为正斜杠
        $base_dir = rtrim($base_dir, '/') . DIRECTORY_SEPARATOR;
        $base_dir = rtrim($base_dir, DIRECTORY_SEPARATOR) . '/';
        //初始化命名空间前缀数组
        //如果前缀已存在数组中则跳过，否则存入数组
        if (isset(self::$prefixes[$prefix]) === false) {
            self::$prefixes[$prefix] = [];
        }
        if ($prepend) {
            //命名空间前缀相同时，后增基目录（array_unshift() 函数用于向数组插入新元素。新数组的值将被插入到数组的开头。）
            array_unshift(self::$prefixes[$prefix], $base_dir);
        } else {
            //前增，向数组尾部增加值
            array_push(self::$prefixes[$prefix], $base_dir);
        }
    }
~~~
详细解释：这里的内容比较抽象，请不要着急，慢慢理解。
在前面我说过很多次的类映射，将命名空间的路径映射为项目中控制器类的真实路径。下面举个栗子~，我在配置文件中添加一个配置项
``    'namespace_map_list' => [
        'S' => S_PATH . 'S/core',
        'Home'    => S_PATH . 'Application/Home/Controller',
    ],``
键名是``namespace_map_list``，而对应的值是一个数组，然后看这个数组，这个数组中的每一个键值对中的键，就是命名空间的路径，而对应的值，就是真实的项目路径，例如：项目中存在一个``Home``模块，这个模块下的所有控制器类的命名空间都是``Home``，所对应的真实路径是``S_PATH . 'Application/Home/Controller'``，当路由解析URL得到的模块名是Home，控制器名是IndexController时，就会查找映射配置中是否存在这个模块，如果有的话，就去对应的项目路径中去寻找真正的控制器类并动态加载进来。这就是类映射存在的意义。
所以，``getMapList()``方法先获得了配置文件中的映射配置项，然后遍历这个配置项（每个键值对都是一个映射），对每一个键值对都调用``addNamespace()``方法，把得到的名称存到一个静态数组中，这样以后实例化控制器时，就直接在这个静态数组中进行寻找真实路径。


* * * * *
接下来是自动加载类：
~~~
  private static function s_autoload($className){
        // 当前命名空间前缀
        $prefix = $className;
        //从后面开始遍历完全合格类名中的命名空间名称，来查找映射的文件名
        //strpos获取参数2在参数1中最后出现的位置，substr截取字符串
        while (false !== $pos = strrpos($prefix, '\\')) {
            // 命名空间前缀
            $prefix = substr($className, 0, $pos + 1);
            // 相对的类名
            $relative_class = substr($className, $pos + 1);
            //尝试加载与映射文件相对的类
            $mapped_file = self::loadMappedFile($prefix, $relative_class);
            if ($mapped_file) {
                return $mapped_file;
            }
            //去除前缀的反斜杠
            $prefix = rtrim($prefix, '\\');
        }
        return false;
    }
    private static function loadMappedFile($prefix, $relative_class)
    {
        //这个命名空间前缀是否存在基本的目录？
        if (isset(self::$prefixes[$prefix]) === false) {
            return false;
        }
        $relative_class = str_replace('\\', '/', $relative_class);
        foreach (self::$prefixes[$prefix] as $base_dir) {
            $file = $base_dir . $relative_class . '.php';
            // 如果映射文件存在就加载它
            if (self::requireFile($file)) {
                return true;
            }
        }
        return false;
    }
    
    //文件加载
    private static function requireFile($file)
    {
        if (file_exists($file)) {
            include $file;
            return true;
        }
        return false;
    }
}
~~~
每一行的注释我都写的很清楚啦，慢慢理解，这里很抽象~~~