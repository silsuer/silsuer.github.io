---
layout:     post
title:      "PHP手动搭建MVC框架（11）"
subtitle:   " 自己动手撸一个MVC框架 "
author:     "silsuer"
header-img: "img/post-bg-2015.jpg"
tags:
    - PHP
---

#### 数据库操作类
在教程开头我说过，我最喜欢的就是TP中的数据库连贯操作，写起来非常爽，所以在这个框架里，我也自己封装了一个数据库操作类。
下面开始写写我的思路：
1.单例模式：问了不浪费资源，我认为需要用单例模式
2.在构造函数中创建PDO对象：这个类使用的是PDO连接，现在的PHP并不建议像以前那样是用mysqli模块来操作数据库，建议使用PDO操作，PDO可以有效的防止注入，增加数据库的安全性。
3.连贯操作的核心就是在每个中间函数（如where函数、limit函数）中，最后返回当前对象``$this``
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
1.构造函数
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

2.select()函数
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

3.where函数
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

4.limit函数
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

5.add函数
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