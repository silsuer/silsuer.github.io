---
layout:     post
title:      "golang程序优雅关闭与重启"
subtitle:    "bingo run 命令集合"
author:     "silsuer"
header-img: "img/post-bg-kuaidi.jpg"
tags:
    - Go
    - Bingo
---

# golang程序优雅关闭与重启

# 何谓优雅

当线上代码有更新时，我们要首先关闭服务，然后再启动服务，如果访问量比较大，当关闭服务的时候，当前服务器很有可能有很多
连接，那么如果此时直接关闭服务，这些连接将全部断掉，影响用户体验，绝对称不上优雅

所以我们要想出一种可以平滑关闭或者重启程序的方式

是谓优雅。

## 思路

1. 服务端启动时多开启一个协程用来监听关闭信号
2. 当协程接收到关闭信号时，将拒绝接收新的连接，并处理好当前所有连接后断开
3. 启动一个新的服务端进程来接管新的连接
4. 关闭当前进程

## 实现

以 [siluser/bingo](https://github.com/silsuer/bingo)框架为例

> 关于这个框架的系列文章：

  - [使用Go写一个简易的MVC的Web框架](https://studygolang.com/articles/12818)
  - [使用Go封装一个便捷的ORM](https://studygolang.com/articles/12825)
  - [改造httprouter使其支持中间件](改造httprouter使其支持中间件)
  - [仿照laravel-artisan实现简易go开发脚手架](https://studygolang.com/articles/14148) 



我使用了[tim1020/godaemon](https://github.com/tim1020/godaemon)这个包来实现平滑重启的功能（对于大部分项目来说，直接使用可以满足大部分需求，无需改造）

期望效果：

在控制台输入 `bingo run daemon [start|restart|stop]` 可以令服务器 `启动|重启|停止`

1. 先看如何开启一个服务器 (`bingo run dev`)

关于 `bingo` 命令的实现可以看我以前的博客： [仿照laravel-artisan实现简易go开发脚手架](https://studygolang.com/articles/14148)

因为是开发环境嘛，大体的思路就是吧 `bingo run`命令转换成令 `go run start.go` 这种 `shell`命令

所以 `bingo run dev`就等于 `go run start.go dev`

```go
//处理http.Server，使支持graceful stop/restart
func Graceful(s http.Server) error {
	// 设置一个环境变量
	os.Setenv("__GRACEFUL", "true")
	// 创建一个自定义的server
	srv = &server{
		cm:     newConnectionManager(),
		Server: s,
	}

	// 设置server的状态
	srv.ConnState = func(conn net.Conn, state http.ConnState) {
		switch state {
		case http.StateNew:
			srv.cm.add(1)
		case http.StateActive:
			srv.cm.rmIdleConns(conn.LocalAddr().String())
		case http.StateIdle:
			srv.cm.addIdleConns(conn.LocalAddr().String(), conn)
		case http.StateHijacked, http.StateClosed:
			srv.cm.done()
		}
	}
	l, err := srv.getListener()
	if err == nil {
		err = srv.Server.Serve(l)
	} else {
		fmt.Println(err)
	}
	return err
}
```

这样就可以启动一个服务器，并且在连接状态变化的时候可以监听到

2. 以守护进程启动服务器

当使用 `bingo run daemon`或者 `bingo run daemon start`的时候，会触发 `DaemonInit()`函数,内容如下：

```go
func DaemonInit() {
	// 得到存放pid文件的路径
	dir, _ := os.Getwd()
	pidFile = dir + "/" + Env.Get("PID_FILE")
	if os.Getenv("__Daemon") != "true" { //master
		cmd := "start" //缺省为start
		if l := len(os.Args); l > 2 {
			cmd = os.Args[l-1]
		}
		switch cmd {
		case "start":
			if isRunning() {
				fmt.Printf("\n %c[0;48;34m%s%c[0m", 0x1B, "["+strconv.Itoa(pidVal)+"] Bingo is running", 0x1B)
			} else { //fork daemon进程
				if err := forkDaemon(); err != nil {
					fmt.Println(err)
				}
			}
		case "restart": //重启:
			if !isRunning() {
				fmt.Printf("\n %c[0;48;31m%s%c[0m", 0x1B, "[Warning]bingo not running", 0x1B)
				restart(pidVal)
			} else {
				fmt.Printf("\n %c[0;48;34m%s%c[0m", 0x1B, "["+strconv.Itoa(pidVal)+"] Bingo restart now", 0x1B)
				restart(pidVal)
			}
		case "stop": //停止
			if !isRunning() {
				fmt.Printf("\n %c[0;48;31m%s%c[0m", 0x1B, "[Warning]bingo not running", 0x1B)
			} else {
				syscall.Kill(pidVal, syscall.SIGTERM) //kill
			}
		case "-h":
			fmt.Println("Usage: " + appName + " start|restart|stop")
		default:   //其它不识别的参数
			return //返回至调用方
		}
		//主进程退出
		os.Exit(0)
	}
	go handleSignals()
}
```

首先要获取`pidFile` 这个文件主要是存储令程序运行时候的进程`pid`,为什么要持久化`pid`呢？是为了让多次程序运行过程中，判定是否有相同程序启动等操作

之后要获取对应的操作 (start|restart|stop)，一个一个说

> case `start`:

首先使用 `isRunning()`方法判断当前程序是否在运行，如何判断？就是从上面提到的 `pidFile` 中取出进程号

然后判断当前系统是否运行令这个进程，如果有，证明正在运行，返回 `true`，反之返回 `false`

如果没有运行的话，调用 `forkDaemon()` 函数启动程序，这个函数是整个功能的核心

```go
func forkDaemon() error {
	args := os.Args
	os.Setenv("__Daemon", "true")
	procAttr := &syscall.ProcAttr{
		Env:   os.Environ(),
		Files: []uintptr{os.Stdin.Fd(), os.Stdout.Fd(), os.Stderr.Fd()},
	}
	pid, err := syscall.ForkExec(args[0], []string{args[0], "dev"}, procAttr)
	if err != nil {
		panic(err)
	}
	savePid(pid)
	fmt.Printf("\n %c[0;48;32m%s%c[0m", 0x1B, "["+strconv.Itoa(pid)+"] Bingo running...", 0x1B)
	fmt.Println()
	return nil
}
```

`syscall`包不支持win系统，也就意味着如果想在 `windows`上做开发的话，只能使用虚拟机或者 `docker`啦

这里的主要功能就是，使用 `syscall.ForkExec()`，`fork` 一个进程出来

运行这个进程所执行的命令就是这里的参数(因为我们的原始命令是 `go run start.go dev`,所以这里的`args[0]`实际上是 `start.go`编译之后的二进制文件)

然后再把 `fork`出来的进程号保存在 `pidFile`里

所以最终运行的效果就是我们第一步时候说到的 `bingo run dev` 达到的效果

> case `restart`:

这个比较简单，通过 `pidFile`判定程序是否正在运行，如果正在运行，才会继续向下执行

函数体也比较简单，只有两行

```go
syscall.Kill(pid, syscall.SIGHUP) //kill -HUP, daemon only时，会直接退出
forkDaemon()
```

第一行杀死这个进程
第二行开启一个新进程

> case `stop`:

这里就一行代码，就是杀死这个进程


## 额外的想法

在开发过程中，每当有一丁点变动（比如更改来一丁点控制器），就需要再次执行一次 `bingo run daemon restart` 命令，让新的改动生效，十分麻烦

所以我又开发了 `bingo run watch` 命令，监听改动，自动重启server服务器

我使用了[github.com/fsnotify/fsnotify](https://github.com/fsnotify/fsnotify)包来实现监听

```go

func startWatchServer(port string, handler http.Handler) {
	// 监听目录变化，如果有变化，重启服务
	// 守护进程开启服务，主进程阻塞不断扫描当前目录，有任何更新，向守护进程传递信号，守护进程重启服务
	// 开启一个协程运行服务
	// 监听目录变化，有变化运行 bingo run daemon restart
	f, err := fsnotify.NewWatcher()
	if err != nil {
		panic(err)
	}
	defer f.Close()
	dir, _ := os.Getwd()
	wdDir = dir
	fileWatcher = f
	f.Add(dir)

	done := make(chan bool)

	go func() {
		procAttr := &syscall.ProcAttr{
			Env:   os.Environ(),
			Files: []uintptr{os.Stdin.Fd(), os.Stdout.Fd(), os.Stderr.Fd()},
		}
		_, err := syscall.ForkExec(os.Args[0], []string{os.Args[0], "daemon", "start"}, procAttr)
		if err != nil {
			fmt.Println(err)
		}
	}()

	go func() {
		for {
			select {
			case ev := <-f.Events:
				if ev.Op&fsnotify.Create == fsnotify.Create {
					fmt.Printf("\n %c[0;48;33m%s%c[0m", 0x1B, "["+time.Now().Format("2006-01-02 15:04:05")+"]created file:"+ev.Name, 0x1B)
				}
				if ev.Op&fsnotify.Remove == fsnotify.Remove {
					fmt.Printf("\n %c[0;48;31m%s%c[0m", 0x1B, "["+time.Now().Format("2006-01-02 15:04:05")+"]deleted file:"+ev.Name, 0x1B)
				}
				if ev.Op&fsnotify.Rename == fsnotify.Rename {
					fmt.Printf("\n %c[0;48;34m%s%c[0m", 0x1B, "["+time.Now().Format("2006-01-02 15:04:05")+"]renamed file:"+ev.Name, 0x1B)
				} else {
					fmt.Printf("\n %c[0;48;32m%s%c[0m", 0x1B, "["+time.Now().Format("2006-01-02 15:04:05")+"]modified file:"+ev.Name, 0x1B)
				}
				// 有变化，放入重启数组中
				restartSlice = append(restartSlice, 1)
			case err := <-f.Errors:
				fmt.Println("error:", err)
			}
		}
	}()

	// 准备重启守护进程
	go restartDaemonServer()

	<-done
}
```

首先按照 `fsnotify`的文档，创建一个 `watcher`，然后添加监听目录（这里只是监听目录下的文件，不能监听子目录）

然后开启两个协程：

1. 监听文件变化，如果有文件变化，把变化的个数写入一个 `slice` 里，这是一个阻塞的 `for`循环

2. 每隔1s中查看一次记录文件变化的 `slice`， 如果有的话，就重启服务器，并重新设置监听目录，然后清空 `slice` ，否则跳过

   递归遍历子目录，达到监听整个工程目录的效果：

```go
func listeningWatcherDir(dir string) {
	filepath.Walk(dir, func(path string, info os.FileInfo, err error) error {
		dir, _ := os.Getwd()
		pidFile = dir + "/" + Env.Get("PID_FILE")
		fileWatcher.Add(path)
		
		// 这里不能监听 pidFile，否则每次重启都会导致pidFile有更新，会不断的触发重启功能
		fileWatcher.Remove(pidFile)
		return nil
	})
}
```

这里这个 `slice` 的作用也就是为了避免当一次保存更新了多个文件的时候，也重启了多次服务器

下面看看重启服务器的代码：

```go
	go func() {
				// 执行重启命令
				cmd := exec.Command("bingo", "run", "daemon", "restart")
				stdout, err := cmd.StdoutPipe()
				if err != nil {
					fmt.Println(err)
				}
				defer stdout.Close()

				if err := cmd.Start(); err != nil {
					panic(err)
				}
				reader := bufio.NewReader(stdout)
				//实时循环读取输出流中的一行内容
				for {
					line, err2 := reader.ReadString('\n')
					if err2 != nil || io.EOF == err2 {
						break
					}
					fmt.Print(line)
				}

				if err := cmd.Wait(); err != nil {
					fmt.Println(err)
				}
				opBytes, _ := ioutil.ReadAll(stdout)
				fmt.Print(string(opBytes))

			}()
```

使用 `exec.Command()` 方法得到一个 `cmd`

调用 `cmd.Stdoutput()` 得到一个输出管道，命令打印出来的数据都会从这个管道流出来

然后使用 `reader := bufio.NewReader(stdout)` 从管道中读出数据

用一个阻塞的`for`循环，不断的从管道中读出数据，以 `\n` 为一行，一行一行的读

并打印在控制台里，达到输出的效果，如果这几行不写的话，在新的进程里的 `fmt.Println()`方法打印出来的数据将无法显示在控制台上.

就酱,最后贴下项目链接 [silsuer/bingo](https://github.com/silsuer/bingo)  ，欢迎star，欢迎PR，欢迎提意见
