---
layout:     post
title:      "S-Framework 从零开始搭建一个MVC框架"
author:     "silsuer"
header-img: "img/post-bg-2015.jpg"
tags:
    - PHP
---

＃ 手动搭建一个MVC框架
## 写在前面

这个框架是我模仿ThinkPHP搭建的，原本是放在看云上的，后来搭了自己的博客就迁移到这里来了，框架的使用方法后续会写出来   我把写这个框架时候的每一步的思路加上我自己的理解都详详细细的写在了这篇文章里。

本教程适用于：
1.  学完原生PHP代码，打算一展身手的兄弟
2.  有框架使用经验，想要深入理解框架的程序员
3.  想要搭建自己的框架，却觉得无从下手的初级程序员。

以后我会不断的把一些PHP处理类库实现的方法写进来，不断完善S框架。


## 文档简介

最近放假（2017年1月份），趁着假期有时间，我接了一个项目，用ThinkPHP做一个网站，本人是重度TP使用者，TP是我接触的第一个框架，甚至在原生PHP还没有学好的时候，我就已经用TP搭了自己的第一个站了，说说我自己对TP的感受：

     1.  语法简单 : 我最喜欢的就是TP的连贯操作，操作数据库太轻松了，实际上对于一个网站来说，核心就是对数据库的增删改查，然后将结果显示到网页中，在TP中，只要使用``M('table_name')->where('id=5')->select();``就可以很轻松的拿到数据库的信息
     2.  结构明显: TP把整个网站模块化，“后台模块”、“前台模块”、“会员模块”等，只要在入口文件里注册过，就可以自动创建模块结构，而每个模块中都有相同的结构，Model、Controller、View等，还可以单独的制作配置文件加载进去，而且可以在配置文件中指定目录结构，高度定制化
     3.  过于臃肿: TP的核心版本（去掉了所有的扩展类库）也有300多k，我详细看了里面的代码，或许是出于对安全的考虑？在我看来，很多函数有更好的实现方法，还有钩子等，我认为对于小型网站来说，没有必要使用，钩子一般是用来执行一些与程序执行不相关的任务（记录运行日志等），这样会增加运行时间，影响效率。完全可以更加精简，提升效率，我按照这篇教程里写的MVC框架核心类库只有不到30k。
    4. 报错莫名其妙: 很多时候，TP报的错误我根本找不到原因......这也是自己技术不到家，比如上传错误啊、缓存错误啊，很多种，每次都要靠度娘，挺折磨人的，而且有时候还牵扯到底层代码，我也不敢去动，只能对着屏幕干瞪眼，然后换一种思路去实现需求。

基于以上几点，我决定自己仿照TP的语法搭建一个MVC框架，因为我自身技术也一般，没接触过太深层次的代码，写了将近一个月，查了很多资料，也看了好几个框架的源代码，发现它们的实现原理都是大同小异，也算终于写完了这个框架，具体步骤请继续往下看。

## TP执行流程详解
#### TP执行流程
     我查看了TP的核心源码，下面是我对TP执行的一些理解(从入口开始，只是一个大概流程):

     1. 入口文件：
	 
         单入口文件，里面包含TP的入口文件，`require './ThinkPHP/ThinkPHP.php'`;
		 
         有多个模块的话也可以定义多个入口，（比如对于后台模块，再新建一个admin.php）
		 
     2.TP入口文件ThinkPHP.php
	 
         1.  记录运行时间（钩子），用于输出日志和调试，个人认为没什么用.........
         2.  定义系统常量：URL模式、类文件后缀、当前文件目录、系统运行目录、是否调试模式、缓存目录、模版目录、配置文件目录....等等，然后引入核心Think类`Think.class.php`   ,引入后执行这个类中的start函数
    
         3.Think.class.php类以及start函数
		 
               1.在start函数中，先定义注册函数，然后定义错误和异常处理函数（spl_autoload_register用于自动加载未加载的类，register_shutdown_function定义PHP程序执行完成后执行的函数，set_exception_handler是自定义异常处理函数，这三个函数的参数都是一个方法名，当自动加载、执行完成、出现异常的时候，将用这里面传的方法参数代替php原本的处理机制，比如 set_exception_handler('Think\Think::appException'); 出现异常的时候会调用appException函数，而不是PHP原生的异常处理函数）
			   
              2.加载各种文件：核心文件、配置文件、模式别名定义、模式行为定义等
              3.设置系统时区
              4.调用App类中的run方法
              5.这个类中的其他函数就是在第一步中说到的自定义加载、处理函数，（自定义加载中用到了类名映射，就是从当前url中解析出模块名、控制器名、方法名，）
       4.App类以及run函数
            1.run函数中先执行监听（钩子类中的）函数监听init方法
            2.执行init方法（加载动态配置、安全过滤等）；
            3.再执行钩子类监听函数，监听begin方法，设置session，获得到应用执行时间
            4.执行exec函数(去寻找从url中解析出的类，并将其实例化后调用方法，输出结果)
            5.执行监听函数监听end函数（应用结束）；
			
这样整个执行流程就完毕了 ，我看了好几天...挺难懂的，而且我觉得TP中要动态加载的类太多了，对于中小型网站来说，用不上，反而影响运行速度，然后我把这个执行流程里面比较重要的部分挑出来，写进了我的框架中，里面的大部分函数名与TP相同，但是完全是我自己用代码实现的，并没有用TP的思路。下一章会详细讲解我自己理解的MVC框架及思路。

## 我眼中的MVC
#### MVC
     MVC（即模型Model、控制器Controller、视图View），模型用于操控数据库，简化数据库操作，控制器用代码，通过模型类访问数据库并拿到数据，将其进行处理后传递给视图，视图用于显示网页，将控制器传递来的数据经过html、css美化后显示在网页中。
	 
     我认为，对于一个网站，核心是url（网址），网址是网站的灵魂，每一次的访问，都要通过url来进行，所以PHP拿到一个网址后，首先要做的就是解析url，从网址中解析出模块名，控制器名和方法名，然后通过模块名和控制器名在真实的路径中查找到这个控制器类所在的路径，并将其include进来，实例化后执行方法。
     
	 综上所述，结合上一章的TP执行流程，我觉得必须的步骤有几个：
	 
     比如说对于一个网址：www.example.com/index.php?m=Index&c=IndexController&a=index&params1=abc&params2=2
      
	  
     1. 当访问这个网址时，首先经过单入口文件index.php:
              index.php中将引入核心文件core.php
     2. core.php
              1. 定义所有系统常量，脚本执行的所有路径、是否是调试模式、系统应用目录、控制器类后缀名
              2. 引入配置文件
              3. 引入系统函数库
              4. 引入系统核心执行类App
              5. 执行App类的run()函数
     3. App类以及run函数
              1. run函数
                   1. 设置字符集
                   2. 系统类映射
                   3. 自动加载注册方法
                   4. 实例化路由类:new Route()
              2. App类中的其他函数就是1.中提到的设置字符集，类映射，自动加载注册的自定义方法
    4. 实例化路由
              1.  实例化路由类后，会自动执行构造函数：
                  1. 构造函数会执行URL解析函数，从当前URL中获得模块名，控制器名和方法名
                  2. 解析后执行的一个函数，用于实例化控制器类，并调用解析出来的方法
              2. 路由类中的其他函数：
                  1. url解析函数
                  2. 控制器类实例化及调用函数

这样，就把TP的执行流程精简了。现在框架的执行流程介绍完了，接下来就要按照这个流程来写框架了，为了方便，我给自己的MVC框架起名为S，为了让框架结构更加清晰，我先创建出了框架的目录结构如下：

   ![](http://blog.hongjian.me/wp-content/uploads/2017/08/905fb5015c01dd05e6ba8efdb4d0c025.png)
    下面将要介绍目录结构和一些准备工作，将正式开始制作框架...
	
## 目录结构
上面介绍了我自己精简后的MVC框架，并给出了目录结构，下面我就介绍一下这个目录：
![](http://blog.hongjian.me/wp-content/uploads/2017/08/905fb5015c01dd05e6ba8efdb4d0c025.png)
这个目录也是仿照TP默认结构做的:
         
         1. Application目录中放置所有模块，比如Admin模块、Home模块等等，每个模块下有Common目录，用于防止自定义配置文件和自定义函数文件，还有Controller目录，用于放置该模块下的所有控制器类文件，View目录放置所有的模版文件（html等）
         2. Data目录放置所有的资源文件：css、js、images等
         3. S目录放置系统运行类及核心函数等
               1. core目录：这个目录放置所有核心运行时需要用到的类：
                     1. 配置文件类:动态加载所需的配置文件
                     2. 模型类：用于连接数据库，实现对数据库的增删改查
                     3. 路由类：用于解析URL，并执行相应方法
                     4. 自定义异常类：当报错的时候，调用这个类，把报的错误更加清晰的显示出来
                     5. 加载运行类：定义类映射（即把类的命名空间路径和类的真实路径通过某种规定的方式映射，使其可以正确包含）
                     6. 还有一个Common目录，用于放置框架配置文件和公共函数文件
               2. Extend目录：放置扩展类库，需要使用一些第三方类库（比如Smarty、验证码类等）中时放置到这里，可以使用内置的加载函数import很容易的导入到所需位置。       
               3. 框架核心类，用于定义框架需要的所有常量
               4. index.php 单入口文件，仅仅需要包含框架核心类而已
			   
这就是这个框架的目录介绍，相当与整个基石，以后的所有开发都将从这里面定义的所有文件中开始，好啦，我们可以根据上面的执行流程开始正式制作啦~         

## 入口文件及核心文件

还记得“我眼中的MVC”中我说过的执行流程吗？不记得的话请返回到那里重新复习一下，执行流程和目录结构必须烂熟于心，不然继续往下看的话可能会觉得很乱哒！

#### 入口文件：

index.php,这个没有什么可说的，单入口文件，只要引入核心文件``S-Framework.php``就可以了

``<?php
/*
 *S-Framework入口文件，直接引入初始化文件
 */
define('APP_DEBUG',true);  //可以在这里定义是否是调试模式，后面会写，调试模式就开启报错机制，
require './S/S-Framework.php';
//后面不需要任何代码，也不需要“?>”表示php文件的结束，并不建议这样做``

#### 核心文件
   这个文件就是入口文件中引入的``S-Framework.php``
   
   首先要写当前的命名空间，在这里我们使所有核心类库的命名空间都是S
   ``<?php
  namespace S;
    ``
1. 然后定义常量，我们需要的常量有：

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

 2. 引入系统配置类
    ``include(CORE_PATH . 'Config.php');``
    
 3. 引入系统函数库
 ``include(CORE_PATH . 'Common/functions.php');``
 
 4. 引入加载函数
 ``include(CORE_PATH . 'S.php');``
 
 5. 执行加载函数的run方法
   ``S::run();``
   

以上就是入口文件以及核心文件，下面从定义常量之后的操作开始讲起，第一个先讲系统配置类 Config.php,在使用系统配置类之前，需要使用引入的系统函数库中的一个函数，TP中的是C函数，所以这里我也用这个函数名 ``C()``函数，请看下面的介绍。

## 系统配置类

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

## 核心运行类

现在我们已经有了配置类，至于配置文件中有什么样的键值对，我们可以边做，需要时再去定义，这相当于我们的准备工作，现在我们可以开始继续顺着我们的执行流程继续做啦~

接下来我们要做的是核心运行类``S.php``,在前面我写过的``入口文件及核心文件``的最后，是引入核心运行类，并执行这个类的run方法
~~~

 4. 引入加载函数
 ``include(CORE_PATH . 'S.php');``
 
 5. 执行加载函数的run方法
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

## 路由类

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

这样，在``parseUrl``中，首先用``$_GET[]``分别获取到当前的模块、控制器、方法的值，如果url中没有，就使用默认的配置文件中的值，并把它赋值给相应的变量。然后，构造函数又调用了``newAction()``方法，把获取到的这三个值拼接成控制器文件的字符串路径，如果这个路径对应的文件存在，那就再次根据模块名和控制器名，拼接出这个控制器的命名空间，然后去判断这个命名空间下是否存在这个类，如果存在，证明我们找到了这个类，就去实例化这个类，实例化之后，就去判断这个类中是否存在需要调用的方法，如果存在，那么就正式的去调用这个类，至此，整个PHP执行流程结束。

#### 很简单吧？其实把框架掰开了揉碎了看，就那么几个步骤，只要自己试着写写，很容易就明白的
##### 上面的代码中用到了``S_Exception``类，这是一个自定义的异常类，下一节会讲到。

## 自定义异常类

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

## 我们在开发中经常会用到很多的函数，有些是PHP内置的，有些需要自己去实现，为了减少代码冗余，我就自己封装了一些常用的函数，如下：

1.  C()函数
  可能ThinkPHP里最有标志性的就是它的这些大写字母的函数了吧，C函数在系统配置类中已经写过了，需要的请去前面的章节中查看
2. I()函数
~~~
function I($a){
    $b = array_merge($_GET,$_POST);
    return $b[$a];
}
~~~
这里只是简单的把``$_GET和$_POST``合并后返回，如果需要的话也可以自己去添加过滤函数等等，这里为了方便，不再赘述

3. dump()函数
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

4. import()函数：
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

5. session()函数
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

6. redirect()函数
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

7. isAjax、isPost、isGet函数
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

8. 这个函数是重中之重：M()函数
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

## 数据库操作类

在教程开头我说过，我最喜欢的就是TP中的数据库连贯操作，写起来非常爽，所以在这个框架里，我也自己封装了一个数据库操作类。

下面开始写写我的思路：
1. 单例模式：问了不浪费资源，我认为需要用单例模式
2. 在构造函数中创建PDO对象：这个类使用的是PDO连接，现在的PHP并不建议像以前那样是用mysqli模块来操作数据库，建议使用PDO操作，PDO可以有效的防止注入，增加数据库的安全性。
3. 连贯操作的核心就是在每个中间函数（如where函数、limit函数）中，最后返回当前对象``$this``
废话不多说，老规矩，先给出所有代码，然后再慢慢细说，开始写正题：
~~~
<?php
namespace S;
class Model{
    protected static $db;
    private static $model;
    private  static $tableName;
    private $table_prefix;
    private  $sql;
    private $sql_where= '';
    private $sql_limit = '';
    private $sql_insert = '';
    private $sql_create_table;
    private $sql_save = '';
    private function init(){
        $this->sql_where='';
        $this->sql = '';
        $this->sql_limit = '';
        $this->sql_insert='';
        $this->sql_create_table='';
        $this->sql_save='';
    }
    /**
     * @intro 单例模式 ,获取唯一的对象
     * @param $table_name
     * @return Model
     */
    public static function getInstance($table_name){
        self::$tableName = $table_name;
        if (!self::$model instanceof self){
            self::$model = new self();
        }
        return self::$model;
    }

    /**
     * Model constructor. 实例化本对象，读取配置文件中数据库的配置，并实例化pdo对象，返回本对象
     * @throws S_Exception
     */
    private function __construct(){
        $dsn = C('database');
        $this->table_prefix = $dsn['db_prefix'];
        //  new PDO('mysql:host=localhost;dbname=bocishangai', 'root', '815581420shenC');
        try{
            self::$db = new \PDO('mysql:host='.$dsn['db_host'] . ';dbname=' . $dsn['db_name'] . ';charset='. $dsn['db_charset'],$dsn['db_user'],$dsn['db_password']);
        }catch (S_Exception $e){
            throw new S_Exception('数据库连接出现错误');
        }
        return $this;
    }

    private function __clone(){
    }


    /**
     * @intor 查询函数，要么不传参，要么只能传入一个数组，函数拼接sql语句，进行查询
     * @param null $parm 传入的参数，传入要查询的列
     * @return array 返回查询结果（数组形式）
     * @throws S_Exception
     */
    public function select($parm = null){

        //$parm 要么不传，要么只能传入一个数组
        if (is_array($parm)){
            $sqli = rtrim($this->mutliArr($parm),','); //把传入的数组拼接成字符串
            $this->sql = 'select ' . $sqli . ' from ' .$this->table_prefix . self::$tableName . $this->sql_where ;//拼接sql语句
        }else{
            if (!is_null($parm)){
                throw new S_Exception( __METHOD__ .  '传入的参数错误！');
            }
            $this->sql = "select * from " . $this->table_prefix . self::$tableName . $this->sql_where . $this->sql_limit; //不是数组的话，就查询所有列
        }


        $res = self::$db->query($this->sql);
        $res->setFetchMode(\PDO::FETCH_ASSOC);


        $arr = [];
        foreach ($res as $row){
            $arr[]  = $row;
        }
        $this->init();  //由于是单例模式，每次执行完sql语句，要将原本的所有的变量都清空，防止多次执行时出错
        if (empty($arr)){
            return false;
        }
        return $arr;
    }


    /**
     * 把数组连接成字符串
     * @param $array  传入的数组
     * @return string 返回生成的字符串
     */
    public function mutliArr($array){
        $sqli = '';
        foreach ($array as $v){
            $sqli .= $v . ',';
        }
        return $sqli;
    }

    /**
     * @intro where函数，把传进来的参数拼接成where字符串，并赋值给私有变量$sql_where ，然后返回本对象，实现联动执行方法
     * @param null $parm  传入的条件查询参数数组
     * @return $this  返回本对象
     * @throws S_Exception
     */
    public function where($parm = null){
        if (!is_array($parm)){
            throw new S_Exception(__METHOD__ . '参数错误!');
        }else{
            $this->sql_where =  ' where ' . rtrim(trim($this->multiWhere($parm)),'and');
        }
        return $this;
    }

    /**
     * @intro 把传入的数组拼接成where字符串并返回
     * @param $parm  传入的数组
     * @return string  返回拼接的字符串
     * @throws S_Exception
     */
    public function multiWhere($parm){
        if (!is_array($parm)){
            throw new S_Exception(__METHOD__ . '参数错误!');
        }
        $where_prepare = '';
        foreach ($parm as $k => $value) {
            if (is_array($value)){
                $where_prepare .=' '. $k . ' ' . $value[0] . $value[1] . ' and';
            }else{
                $where_prepare .= ' ' .$k . ' = '.'\'' . $value.'\'' . ' and';
            }

        }
        return $where_prepare;
    }

    /**
     * @intro 拼接limit语句，并返回本对象
     * @param $first
     * @param null $second
     * @return $this
     */
    public function limit($first, $second = null){
        if (is_null($second)){
            $this->sql_limit = ' limit ' . $first ;
        }else{
            $this->sql_limit = ' limit ' . $first . ',' . $second;
        }
        return $this;
    }

    public function add($parm = null){
        if (!is_array($parm)){
            throw new S_Exception(__METHOD__ . '参数不正确!');
        }
        $sql_in = rtrim(trim($this->multiInsert($parm)),',');
        $arr_in = $this->arrayInsert($parm);
        $this->sql_insert = 'insert into ' . $this->table_prefix . self::$tableName . ' set ' . $sql_in;
        $a = self::$db->prepare($this->sql_insert)->execute($arr_in);
        $this->init();
        return $a;

    }
    public function multiInsert($parm){
        if (!is_array($parm)){
            throw new S_Exception(__METHOD__ . '参数不正确');
        }
        $sql_in = '';
        foreach ($parm as $k => $v){
            $sql_in .= $k . '=:'. $k . ',';
        }
        return $sql_in;
    }
    public  function arrayInsert($parm){
        if (!is_array($parm)){
            throw new S_Exception(__METHOD__ . '参数不正确');
        }
        $arr = [];
        foreach ($parm as $k => $v){
            $arr[':'.$k] = $v;
        }
        return $arr;
    }

    public function createDatabase(){

    }

    public function createTable($tableName,$str){
        self::$db->setAttribute(\PDO::ATTR_ERRMODE,\PDO::ERRMODE_EXCEPTION);
        $this->sql_create_table = "create table " . $this->table_prefix . $tableName ."( " . $str . " )";
        self::$db->exec($this->sql_create_table);
        $this->init();
        return true;
    }

    public function setField($column,$value){
        //修改
        if (is_int($value)){
            $this->sql_save='update ' . $this->table_prefix . self::$tableName . ' set ' . $column . '=' . $value . $this->sql_where;
        }elseif (is_string($value)){
            $this->sql_save='update ' . $this->table_prefix . self::$tableName . ' set ' . $column . '=\'' . $value .'\''. $this->sql_where;
        }
        $res=self::$db->exec($this->sql_save);
        $this->init();
        return $res;
    }
    public  function save($parm){
        if (!is_array($parm)){
            throw new S_Exception(__METHOD__ . '参数错误');
        }
        $multiSql = trim(rtrim($this->multiSave($parm)),',');
        $this->sql_save = 'update ' . $this->table_prefix . self::$tableName . ' set ' . $multiSql . $this->sql_where;
        $res = self::$db->exec($this->sql_save);
        return $res;
    }
    public function multiSave($parm){
        if (!is_array($parm)){
            throw new S_Exception(__METHOD__ ."参数不正确");
        }
        $str='';
        foreach ($parm as $k =>$v){
            if (is_int($v)){
                $str .= $k . '=' . $v . ',';
            }elseif (is_string($v)){
                $str .=$k . '=\'' . $v .'\',';
            }
        }
        return $str;
    }
}
~~~
好的，我们回顾一下，上一章的M函数里首先获取了这个类的单例 ``getInstance()``获取单例，这个没有什么可说的，单例模式就是这样的，讲系统配置类的时候我详细的写过，忘记的朋友可以返回去再看看。下面开始讲解里面的函数
1. 构造函数
~~~
    private function __construct(){
        $dsn = C('database');  //首先获取配置文件中的dsn,即数据库信息
        $this->table_prefix = $dsn['db_prefix'];   //把表的前缀赋值给一个变量，这样在连接时就不用每次都添加表前缀了
        try{
            self::$db = new \PDO('mysql:host='.$dsn['db_host'] . ';dbname=' . $dsn['db_name'] . ';charset='. $dsn['db_charset'],$dsn['db_user'],$dsn['db_password']);  //把dsn配置信息拼接成参数字符串，作为PDO类的参数，实例化PDO类
        }catch (S_Exception $e){
            throw new S_Exception('数据库连接出现错误');
        }
        return $this;  //由于需要连贯操作，这里要返回当前对象$this
    }
~~~

这里我想多提一句，创建数据库时添加表前缀是非常有必要的，因为很多爆破工具呀，啊D，明小子这种，它们的暴力破解方法就是跑字典，把常用的表名都注入一遍，如果你还在用``admin``做表名的话，很容易被爆出来，所以为了你的数据库安全，请务必添加表名，比如``example_admin``，这样就可以抵挡住很大一部分低级黑客（也许是脚本小子？）的攻击

2. select()函数
~~~
    public function select($parm = null){
        //$parm 要么不传，要么只能传入一个数组
        if (is_array($parm)){
            $sqli = rtrim($this->mutliArr($parm),','); //把传入的数组拼接成字符串
            $this->sql = 'select ' . $sqli . ' from ' .$this->table_prefix . self::$tableName . $this->sql_where ;//拼接sql语句
        }else{
            if (!is_null($parm)){
                throw new S_Exception( __METHOD__ .  '传入的参数错误！');
            }
            $this->sql = "select * from " . $this->table_prefix . self::$tableName . $this->sql_where . $this->sql_limit; //不是数组的话，就查询所有列，拼接sql字符串
        }
        $res = self::$db->query($this->sql);  //执行查询
        $res->setFetchMode(\PDO::FETCH_ASSOC);  //设置返回格式，PDO有多种返回格式
        $arr = [];
        foreach ($res as $row){
            $arr[]  = $row;
        }
        $this->init();  //由于是单例模式，每次执行完sql语句，要将原本的所有的变量都清空，防止多次执行时出错
        if (empty($arr)){
            return false;
        }
        return $arr;
    }
    
 public function mutliArr($array){  //把传入的数组拼接成字符串
        $sqli = '';
        foreach ($array as $v){
            $sqli .= $v . ',';
        }
        return $sqli;
    }
~~~
传入的参数一定要是一个数组，然后处理数组，拼接为sql语句，并执行查询，并将得到的结果返回。``M('admin')->select()``查询admin表中的所有数据

3. where函数
~~~
  public function where($parm = null){
        if (!is_array($parm)){
            throw new S_Exception(__METHOD__ . '参数错误!');
        }else{
            $this->sql_where =  ' where ' . rtrim(trim($this->multiWhere($parm)),'and');    //设置where语句的值，并且返回当前对象用于连贯操作
        }
        return $this;
    }
    
        public function multiWhere($parm){  //把where中的数组值处理成Mysql能识别的字符串内
        if (!is_array($parm)){
            throw new S_Exception(__METHOD__ . '参数错误!');
        }
        $where_prepare = '';
        foreach ($parm as $k => $value) {
            if (is_array($value)){
                $where_prepare .=' '. $k . ' ' . $value[0] . $value[1] . ' and';
            }else{
                $where_prepare .= ' ' .$k . ' = '.'\'' . $value.'\'' . ' and';
            }

        }
        return $where_prepare;
    }
~~~
写的挺明白的吧.....好像没法再详细讲解了，这样的一个类，我就可以使用``M('admin')->where(array('id'=>'5'))->select()``查询admin表里id为5的所有数据

4. limit函数
~~~
   public function limit($first, $second = null){  //拼接limit字符串，并返回当前对象用于连贯操作
        if (is_null($second)){
            $this->sql_limit = ' limit ' . $first ;
        }else{
            $this->sql_limit = ' limit ' . $first . ',' . $second;
        }
        return $this;
    }
~~~
没什么可说的，设定limit字符串

5. add函数
~~~
    public function add($parm = null){  
        if (!is_array($parm)){
            throw new S_Exception(__METHOD__ . '参数不正确!');
        }
        $sql_in = rtrim(trim($this->multiInsert($parm)),',');   //处理传进来的参数
        $arr_in = $this->arrayInsert($parm);
        $this->sql_insert = 'insert into ' . $this->table_prefix . self::$tableName . ' set ' . $sql_in;   //拼接字符串
        $a = self::$db->prepare($this->sql_insert)->execute($arr_in);  //执行添加操作
        $this->init();  //初始化值
        return $a;   //返回插入后的id
    }
    
      public function multiInsert($parm){
        if (!is_array($parm)){
            throw new S_Exception(__METHOD__ . '参数不正确');
        }
        $sql_in = '';
        foreach ($parm as $k => $v){
            $sql_in .= $k . '=:'. $k . ',';
        }
        return $sql_in;
    }

~~~

里面所有的操作都是大同小异，思路就是：如果是中间函数（where、limit等），就处理完毕后返回``$this``,如果是结尾函数（select，add，setField）,就拼接字符串并执行，然后返回处理结果就行。

至此，一个完整的MVC框架就搭好了，当然，搭好了并不代表什么，还需要不断的改进，
比如，还没有添加url的过滤操作，可以有效的防止SQL注入。
而且我还打算写一些验证码类，图片处理类、图片上传类等添加进去，让这个框架更加丰富.

对于视图来说，我的建议是使用Smarty模版，把``Smarty.class.php``import进来，就可以很轻松的实现网站搭建了，后续我也会写一个模版类来实现这种功能。

写框架不是目的，我们自己所写的框架在安全性和功能性上肯定不能和大公司大团队的相比，但是写一个自己的框架有利于理解web执行流程，得到更扎实的基础。