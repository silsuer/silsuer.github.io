---
layout:     post
title:      "像Laravel-Artisan一样执行go命令"
author:     "silsuer"
header-img: "img/post-bg-e2e-ux.jpg"
tags:
    - GO
    - Bingo
---

# 像Laravel-Artisan一样执行go命令

## 前言

作为一个`laravel`重度患者，`artisan`是一个不可或缺的功能，可以说这是`laravel`的开发脚手架

可以快速创建需要的文件，加快开发速度

而我目前正在开发的`bingo`框架正是受到`laravel`启发，希望可以快速构建web应用

而一个脚手架是必不可少的东西，所以我实现了一个`bingo sword` 工具


### laravel-artisan实现思路

我曾经写过artisan的解析，链接在这里[laravel artisan 原理解析](https://silsuer.github.io/2018/08/06/laravel-commands/)

简而言之，就是将 `kernel.php` 中注册的所有 `commands` 都实例化一次，然后比对 命令名，对于查找到的命令，调用 `handle`方法执行即可

所以思路就有啦～

### bingo sword 实现思路

先看图,随便画了画流程

![](http://qiniu-cdn.zhiguanapp.com/6af08b9bb9557c79bdadc7c80282dae3)

下面直接上代码：

当命令行中输入 `bingo sword make:command --name=MakeCommand`

那么在 `CLI` 的 `Run()` 方法中，获取参数

```go

swordCmd := flag.NewFlagSet("sword", flag.ExitOnError) // bingo sword 命令

err := swordCmd.Parse(os.Args[2:])
swordConfig = os.Args[2:]
		
if swordCmd.Parsed() {
	cli.swordHandle(swordConfig)
}
``` 

此时接收到了需要的参数，然后调用`swordHanle`方法：

```go
func (cli *CLI) swordHandle(args []string) {
	// 解析这个参数，将数据传入外部
	//fmt.Println(args)
	//获取env中的kernel路径
	//根据kernel去 go shell执行 go run xxx/kernel.go make:controller AdminController
	consoleKernelPath := bingo.Env.Get("CONSOLE_KERNEL_PATH")
	// 获取命令当前执行目录
	dir, _ := os.Getwd()

    // 拼接Kernel的
	consoleKernelAbsolutePath := dir + "/" + consoleKernelPath + "/Kernel.go"

	// 使用go shell 调用 go run xxx/Kernel.go arg1 arg2 arg3

	var tmpSlice = []string{"go", "run", consoleKernelAbsolutePath}

	args = append(tmpSlice, args...)

	// 先检查这个命令是否属于内部命令
	// arg第一个就是命令
	console := Console{}
	console.Exec(args[2:], InnerCommands)

	//[run /Users/silsuer/go/src/test/app/Console/Kernel.go aaa bbb ccc]
    // 执行 go run Kernel.go command:name
	cmd := exec.Command("go",args[1:]...)
	var out bytes.Buffer
	cmd.Stdout = &out

    // 开始执行命令
	if err := cmd.Start(); err != nil {
		panic(err)
	}

    // 等待命令执行完成
	if err := cmd.Wait(); err != nil {
		log.Fatal(err)
	}

    // 打印输出
	fmt.Println(out.String())
}
```

所以我们使用`bingo sword command:name --name=CommandName` 实际上执行的是
`go run app/Console/Kernel.go command:name --name=CommandName`

可以查看 `Kernel.go`的源码，实例化了一个 `console`结构体，并调用了 `Exec()`方法

这个方法：

```go
func (console *Console) Exec(args []string, commands []interface{}) {

    // 将参数封装成了input对象
	input := console.initInput(args)
	// 遍历传入的commands数组（这是在kernel里注册的函数）
	for _, command := range commands {

		// 先做检查,查找对应的命令名
		commandValue := reflect.ValueOf(command)
		// 初始化命令结构体
		initCommand(&commandValue)

		// 映射期望参数与实际输入参数（验证参数输入是否正确）
		target := checkParams(command, &input)
		// 不是这个命令，跳过这个命令
		if target == false {
			continue
		}
		// 获得输入和输出并准备作为参数传入Handle方法中
		var params = []reflect.Value{reflect.ValueOf(input), reflect.ValueOf(Output{})}
		commandValue.MethodByName("Handle").Call(params)
	}
}
```

如果传入的命令名没有对上的话，会跳过这次循环，否则会执行这个命令

值得注意的是，如果命令名一样的话，这些命令都会执行，如果命令中会报错的话，使用`panic()`

只会抛出 `bing/cli/cli_sword.go` 中 `swordHandle()` 中的那行 `panic`错误的代码


### 知识点

1. 使用go执行系统命令

  `cmd := exec.Command("go","run","app/Console/Kernel.go","command:name")`
  
  
  使用 `exec.Command` 将会生成一个 `cmd` 对象，执行 `cmd.Start()` 即可执行命令，这并不会阻塞进程，如果需要获得结果
  
  需要使用 `cmd.Wait()` 等待执行完成，再获取标准输出，当然也可以直接使用 `cmd.Run()` ，这行代码会阻塞进程，直到命令完成
  
  如果获取标准输出呢？
  
  ```go
var out bytes.Buffer
   
cmd.Stdout = &out
  ```
  
 将cmd的标准输出指向我们设定好的一个`buffer`即可
 
2. 使用反射调用结构体的方法

使用 `commandValue := reflect.ValueOf(command)` 获取这个结构体的 `Value`

使用 `commandValue.NumMethod()` 可以获取这个结构体的方法数量，如果传入的 `command`是一个结构体的指针的话

得到的方法数量包括了针对结构体的方法数量和针对结构体指针的方法数量之和，如果传入的是一个结构体对象，那么得到的

方法数量只是包括了针对结构体的方法数量

使用 `commandValue.MethodByName("Handle").Call(params)` 调用结构体对应的方法


3. 在控制台输出带颜色的文字

和shell类似，只需要将控制台输出的信息使用一些颜色字符包裹起来即可

```go
   //其中0x1B是标记，[开始定义颜色，1代表高亮，48代表黑色背景，32代表绿色前景，0代表恢复默认颜色。
	fmt.Printf("\n %c[0;48;32m%s%c[0m\n\n", 0x1B, "["+time.Now().Format("2006-01-02 15:04:05")+"]"+content, 0x1B)
```

#### 最后贴一下项目链接 [bingo](https://github.com/silsuer/bingo) ，欢迎star，更欢迎PR，欢迎提意见～～～


  
  
 
