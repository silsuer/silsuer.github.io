---
layout:     post
title:      "Go语言搭建简易MVC的Web框架"
subject:    "Bingo框架的最早版本"
author:     “silsuer”
header-img: "img/post-bg-kuaidi.jpg"
tags:
    - Go
---


# Bingo 

> 首发于Golang中文网

这东西是我最近开始写的一个玩意儿... 

刚从PHP转过来，对Go的特性还不是很了解，适用了一下gin，觉得虽然挺好的，但是一些语法没有Laravel那么方便

所以想再造个轮子看看... en .... 就酱

bingo是一个基于go语言的轻量级API框架，专注构建restfulAPI

GitHub地址：[silsuer/bingo](https://github.com/silsuer/bingo)

最近我做了很多修改，gayhub上的跟这篇文章很不符，所以在这再把commit的链接贴出来[点这里这里~](https://github.com/silsuer/bingo/commit/51504ce73687c73596e3df260724a6203241bbfe)

## 目录结构

 - app 放置与网站相关代码
 - core 放置框架核心代码a
 - vendor 放置第三方库,使用glide管理第三方库
 - public 放置html代码

## 开发过程

go的net包极其好用，用它开发框架也是极其快速（居然比写php框架还要快...）

首先确定main函数，在main函数中实例化一个结构体，然后调用其中的Run函数即可

动手操作：

   ```go
   func main() {
     // new 一个bingo对象，然后bingo.Run()即可
     // 指定静态目录，默认指向index.html ，加载路由文件
     // 加载env文件
       bingo := new(core.Bingo)
       bingo.Run(":12345")
    }
   ```    
   
接下来去写bingo文件：

   ```go
    func (b *Bingo) Run(port string) {
        // 传入一个端口号，没有返回值，根据端口号开启http监听
    
        // 此处要进行资源初始化，加载所有路由、配置文件等等
        // 实例化router类，这个类去获取所有router目录下的json文件，然后根据json中的配置，加载数据
        // 实例化env文件和config文件夹下的所有数据，根据配置
        // 根据路由列表，开始定义路由，并且根据端口号，开启http服务器
        http.ListenAndServe(port, bin)
        // TODO 监听平滑升级和重启
    }
   ```
   
`Run`函数非常简单，只有一行代码，就是开启一个Http服务器并监听传入的端口，

由于我们要自己控制各种路由，所以我们不能用net包中自带的http服务，网上有很多原理说的很清楚了

我们需要自己实现 `ServeHTTP`方法，以实现Mux这种路由器接口，所以再写一个`ServeHttp`方法

```go
    func (b *Bingo) ServeHTTP(w http.ResponseWriter, r *http.Request) {
        flag := false   // 这个变量用来标记是否找到了动态路由
        // 每一个http请求都会走到这里，然后在这里，根据请求的URL，为其分配所需要调用的方法
        params := []reflect.Value{reflect.ValueOf(w), reflect.ValueOf(r)}
        for _, v := range RoutesList {
            // 检测中间件，根据中间件首先开启中间件，然后再注册其他路由
            // 检测路由，根据路由指向需要的数据
            if r.URL.Path == v.path && r.Method == v.method {
                  flag = true   // 寻找到了对应路由，无需使用静态服务器
                  
                //TODO 调用一个公共中间件，在这个中间件中寻找路由以及调用中间件收尾等功能
    
                // 检测该路由中是否存在中间件，如果存在，顺序调用
                for _, m := range v.middleware {
                    if mid, ok := MiddlewareMap[m]; ok { // 判断是否注册了这个中间件
                        rmid := reflect.ValueOf(mid)
                        params = rmid.MethodByName("Handle").Call(params) // 执行中间件，返回values数组
                        // 判断中间件执行结果，是否还要继续往下走
                        str := rmid.Elem().FieldByName("ResString").String()
                        if str != "" {
                            status := rmid.Elem().FieldByName("Status").Int()
                            // 字符串不空，查看状态码，默认返回500错误
                            if status == 0 {
                                status = 500
                            }
                            w.WriteHeader(int(status))
                            fmt.Fprint(w,str)
                            return
                        }
                    }
                }
                // 检测成功，开始调用方法
                // 获取一个控制器包下的结构体
                if d, ok := ControllerMap[v.controller]; ok { // 存在  c为结构体，调用c上挂载的方法
                    reflect.ValueOf(d).MethodByName(v.function).Call(params)
                }
                // 停止向后执行
                return
            }
        }
    
        // 如果路由列表中还是没有的话,去静态服务器中寻找
        if !flag {
             // 去静态目录中寻找
             http.ServeFile(w,r,GetPublicPath()+ r.URL.Path)
        }
        return
    }
```

可以看到，我们使用重新定义了ServeHttp方法，在这个方法中，我们根据浏览器访问的不同URL，通过反射得到不同的控制器或者中间件的结构体，并且

调用对应的方法，如果访问的URL我们没有定义的话，会到静态文件夹下去寻找，如果找到了，输出静态文件，否则输出404页面

(P.S. 因为我们要实现的是一个无状态的API快速开发框架，所以不需要进行模版渲染，所有数据均通过ajax传输到页面中)

注意到在这个函数里我使用了` MiddlewareMap[m]`以及` ControllerMap[m]` ,这是中间件以及控制器的map，在程序初始化的时候就会存入内存中

具体定义如下：

```go
    // 这里记录所有的应该注册的结构体
    // 控制器map
    var ControllerMap map[string]interface{}
    // 中间件map
    var MiddlewareMap map[string]interface{}
    
    func init()  {
        ControllerMap = make(map[string]interface{})
        MiddlewareMap = make(map[string]interface{})
        // 给这两个map赋初始值 每次添加完一条路由或中间件，都要在此处把路由或者中间件注册到这里
        // 注册中间件
        MiddlewareMap["WebMiddleware"] =&middleware.WebMiddleware{}
    
        // 注册路由
        ControllerMap["Controller"] = &controller.Controller{}
    }

```
在此处我们用到了app/controller以及middleware包下的结构体，当路由解析完成后会把请求的路径和这里的map对应起来，现在我们看看router中解析路由代码：

```go
type route struct {
	path       string   // 路径
	target     string   // 对应的控制器路径 Controller@index 这样的方法
	method     string   // 访问类型 是get post 或者其他
	alias      string   // 路由的别名
	middleware []string // 中间件名称
	controller string   // 控制器名称
	function   string   // 挂载到控制器上的方法名称
}

type route_group struct {
	root_path   string   // 路径
	root_target string   // 对应的控制器路径 Controller@index 这样的方法
	alias       string   // 路由的别名
	middleware  []string // 中间件名称
	routes      []route  // 包含的路由
}

var Routes []route             // 单个的路由集合
var RoutesGroups []route_group // 路由组集合
var RoutesList []route         // 全部路由列表
var R interface{}

func init() {
	// 初始化方法，加载路由文件
	// 获取路由路径，根据路由路径获取所有路由文件，然后读取所有文件，赋值给当前成员变量
	routes_path := GetRoutesPath()
	dir_list, err := ioutil.ReadDir(routes_path)
	Check(err)
	// 根据dir list 遍历所有文件 获取所有json文件，拿到所有的路由 路由组
	for _, v := range dir_list {
		fmt.Println("正在加载路由文件........" + v.Name())
		// 读取文件内容，转换成json，并且加入数组中
		content, err := FileGetContents(routes_path + "/" + v.Name())
		Check(err)
		err = json.Unmarshal([]byte(content), &R)
		Check(err)
		// 开始解析R,将其分类放入全局变量中
		parse(R)
	}
}
```

在准备编译的阶段便会执行init函数，获取到路由文件夹下的所有路由列表，我们使用json格式来组织路由，解析出来的数据存入RoutesList列表中

下面是解析代码

```go

func parse(r interface{}) {
	// 拿到了r 我们要解析成实际的数据
	m := r.(map[string]interface{})
	//newRoute := route{}
	for k, v := range m {
		if k == "Routes" {
			// 解析单个路由
			parseRoutes(v)
		}
		if k == "RoutesGroups" {
			// 解析路由组
			parseRoutesGroups(v)
		}
	}

}

// 解析json文件中的单一路由的集合
func parseRoutes(r interface{}) {
	m := r.([]interface{})
	for _, v := range m {
		// v 就是单个的路由了
		simpleRoute := v.(map[string]interface{})
		// 定义一个路由结构体
		newRoute := route{}
		for kk, vv := range simpleRoute {
			switch kk {
			case "Route":
				newRoute.path = vv.(string)
				break
			case "Target":
				newRoute.target = vv.(string)
				break
			case "Method":
				newRoute.method = vv.(string)
				break
			case "Alias":
				newRoute.alias = vv.(string)
				break
			case "Middleware":
				//newRoute.middleware = vv.([])
				var mdw []string
				vvm := vv.([]interface{})
				for _, vvv := range vvm {
					mdw = append(mdw, vvv.(string))
				}
				newRoute.middleware = mdw
				break
			default:
				break
			}
		}

		// 把target拆分成控制器和方法
		cf := strings.Split(newRoute.target,"@")
		if len(cf)==2 {
			newRoute.controller = cf[0]
			newRoute.function = cf[1]
		}else{
			fmt.Println("Target格式错误！"+newRoute.target)
			return
		}

		// 把这个新的路由，放到单个路由切片中，也要放到路由列表中

		Routes = append(Routes, newRoute)
		RoutesList = append(RoutesList, newRoute)
	}
}

func parseRoutesGroups(r interface{}) {
	// 解析路由组
	m := r.([]interface{})
	for _, v := range m {
		group := v.(map[string]interface{})
		for kk, vv := range group {
			// 新建一个路由组结构体
			var newGroup route_group
			switch kk {
			case "RootRoute":
				newGroup.root_path = vv.(string)
				break
			case "RootTarget":
				newGroup.root_target = vv.(string)
				break
			case "Middleware":
				var mdw []string
				vvm := vv.([]interface{})
				for _, vvv := range vvm {
					mdw = append(mdw, vvv.(string))
				}
				newGroup.middleware = mdw
				break
			case "Routes":
				// 由于涉及到根路由之类的概念，所以不能使用上面的parseRoutes方法，需要再写一个方法用来解析真实路由
				rs := parseRootRoute(group)
				newGroup.routes = rs
				break
			default:
				break
			}
			// 把这个group放到路由组里
			RoutesGroups  = append(RoutesGroups,newGroup)
		}
	}
}

// 解析根路由 传入根路由路径 目标跟路径 并且传入路由inteface列表，返回一个完整的路由集合
// 只传入一个路由组，返回一个完整的路由集合
func parseRootRoute(group map[string]interface{}) []route {
	// 获取路由根路径和目标根路径,还有公共中间件
	var tmpRoutes []route  // 要返回的路由切片
	var route_root_path string
	var target_root_path string
	var public_middleware []string
	for k, v := range group {
		if k == "RootRoute" {
			route_root_path = v.(string)
		}
		if k == "RootTarget" {
			target_root_path = v.(string)
		}
		if k=="Middleware" {
			vvm := v.([]interface{})
			for _, vvv := range vvm {
				public_middleware = append(public_middleware, vvv.(string))
			}
		}
	}

	// 开始获取路由
	for k, s := range group {
		if k == "Routes" {
			m := s.([]interface{})
			for _, v := range m {
				// v 就是单个的路由了
				simpleRoute := v.(map[string]interface{})
				// 定义一个路由结构体
				newRoute := route{}
				for kk, vv := range simpleRoute {
					switch kk {
					case "Route":
						newRoute.path = route_root_path+ vv.(string)
						break
					case "Target":
						newRoute.target = target_root_path+ vv.(string)
						break
					case "Method":
						newRoute.method = vv.(string)
						break
					case "Alias":
						newRoute.alias = vv.(string)
						break
					case "Middleware":
						vvm := vv.([]interface{})
						for _, vvv := range vvm {
							newRoute.middleware = append(public_middleware,vvv.(string))// 公共的和新加入的放在一起就是总共的
						}

						break
					default:
						break
					}
				}
				// 把target拆分成控制器和方法
				cf := strings.Split(newRoute.target,"@")
				if len(cf)==2 {
					newRoute.controller = cf[0]
					newRoute.function = cf[1]
				}else{
					fmt.Println("Target格式错误！"+newRoute.target)
					os.Exit(2)
				}
				// 把这个新的路由，放到路由列表中，并且返回放到路由集合中，作为返回值返回
				RoutesList = append(RoutesList, newRoute)
				tmpRoutes = append(tmpRoutes,newRoute)
			}
		}
	}
   return tmpRoutes
}
```

通过解析json文件，获得路由列表，然后在上面的ServeHttp文件中即可与路由列表进行对比了。


到此，我们实现了一个简单的使用GO制作的Web框架

目前只能做到显示静态页面以及进行API响应

接下来我们要实现的是： 
1. 一个便捷的ORM                                  
2. 制作快速添加控制器以及中间件的命令
3. 实现数据库迁移
4. 实现基于token的API认证
5. 数据缓存
6. 队列
7. 钩子
8. 便捷的文件上传/存储功能

求star，欢迎PR~哈哈哈（[silsuer/bingo](https://github.com/silsuer/bingo)）