# Laravel Command机制原理

## 图解

![artisan原理](http://p2s8l0tbt.bkt.clouddn.com/2d4f3c9c5aeb2e25541d2b740270c842)


## 代码解释

### handle方法



```php

   public function handle($input, $output = null)
    {
        try {
            $this->bootstrap();

            return $this->getArtisan()->run($input, $output);
        } catch (Exception $e) {
            $this->reportException($e);

            $this->renderException($output, $e);

            return 1;
        } catch (Throwable $e) {
            $e = new FatalThrowableError($e);

            $this->reportException($e);

            $this->renderException($output, $e);

            return 1;
        }
    }

```
有用的就两句:
```php
 $this->bootstrap();
 return $this->getArtisan()->run($input, $output);
```

`bootstrap()`方法，用来启动引导程序，这个方法的内容：
```php

  public function bootstrap()
    {
         // hasBeenBootstrapped 是一个标记，标记当前程序是否执行过引导程序
        if (! $this->app->hasBeenBootstrapped()) {
              // 开始引导
            $this->app->bootstrapWith($this->bootstrappers());
        }

        // 执行最终引导
        $this->app->loadDeferredProviders();

         // 
        if (! $this->commandsLoaded) {
            $this->commands();

            $this->commandsLoaded = true;
        }
    }

```

其中 `$this->bootstrappers()`方法只是返回定义好的一个数组，即需要执行的的对象组

他们是

```php
  protected $bootstrappers = [
        \Illuminate\Foundation\Bootstrap\LoadEnvironmentVariables::class,
        \Illuminate\Foundation\Bootstrap\LoadConfiguration::class,
        \Illuminate\Foundation\Bootstrap\HandleExceptions::class,
        \Illuminate\Foundation\Bootstrap\RegisterFacades::class,
        \Illuminate\Foundation\Bootstrap\SetRequestForConsole::class,
        \Illuminate\Foundation\Bootstrap\RegisterProviders::class,
        \Illuminate\Foundation\Bootstrap\BootProviders::class,
    ];
```

作用基本上就是初始化各种数据，比如第一个`\Illuminate\Foundation\Bootstrap\LoadEnvironmentVariables::class`,
就是用来初始化访问`.env`文件的函数的.

得到了数组后，会调用容器的`bootstrapWith`方法，用来开始引导

```php

    public function bootstrapWith(array $bootstrappers)
    {
        // 设置当前已经经过引导，与上面的hasBeenBootstrapped()方法对应
        $this->hasBeenBootstrapped = true;

        foreach ($bootstrappers as $bootstrapper) {
        
            // 这里只是为了记录些引导过程，不必多看
            $this['events']->fire('bootstrapping: '.$bootstrapper, [$this]);

            // 从容器中实例化出当前引导类，并执行这个类的bootstrap方法
            $this->make($bootstrapper)->bootstrap($this);

             // 标记引导完成
            $this['events']->fire('bootstrapped: '.$bootstrapper, [$this]);
        }
    }
```

接下来会执行最终的引导程序:

```php

 public function loadDeferredProviders()
    {
        // We will simply spin through each of the deferred providers and register each
        // one and boot them if the application has booted. This should make each of
        // the remaining services available to this application for immediate use.
        foreach ($this->deferredServices as $service => $provider) {
            $this->loadDeferredProvider($service);
        }
        $this->deferredServices = [];
    }
```

这里实际上是针对第三方的`provider`进行注册，大体思路和服务容器中内置`provider`的注册相同

接下来判断是否加载了Command环境，`$this->commands`方法，但是这里的方法体是空的，不知道这里有什么用处

最开始的第一行代码就到这里，接下来是 `$this->getArtisan()`

这个方法是新建一个容器(这个容器是Console的Application)

然后执行这个容器的`resolveCommands`方法，这个方法会遍历所有注册的commands
并且对每个命令，都实例化一个类，并使用add方法添加到公共属性中（包括别名的设定之类的）


接下来是最终要的 `run`方法：

```php


  public function run(InputInterface $input = null, OutputInterface $output = null)
    {
        $commandName = $this->getCommandName(
            $input = $input ?: new ArgvInput
        );

        $this->events->fire(
            new Events\CommandStarting(
                $commandName, $input, $output = $output ?: new ConsoleOutput
            )
        );

        $exitCode = parent::run($input, $output);

        $this->events->fire(
            new Events\CommandFinished($commandName, $input, $output, $exitCode)
        );

        return $exitCode;
    }
```

有用的只有中间一句  ` $exitCode = parent::run($input, $output);` 

这个方法里面又对输入和输出进行了各种格式化操作，让显示更加人性化

整个run方法里的核心也只有一个 `doRun` 方法：

```php

  public function doRun(InputInterface $input, OutputInterface $output)
    {
        if (true === $input->hasParameterOption(array('--version', '-V'), true)) {
            $output->writeln($this->getLongVersion());

            return 0;
        }

        // 1. 从输入中获取输入的命令名
        $name = $this->getCommandName($input);
        if (true === $input->hasParameterOption(array('--help', '-h'), true)) {
            if (!$name) {
                $name = 'help';
                $input = new ArrayInput(array('command_name' => $this->defaultCommand));
            } else {
                $this->wantHelps = true;
            }
        }

        if (!$name) {
            // 如果不存在的话，就调用默认的命令名，默认的参数
            $name = $this->defaultCommand;
            $definition = $this->getDefinition();
            $definition->setArguments(array_merge(
                $definition->getArguments(),
                array(
                    'command' => new InputArgument('command', InputArgument::OPTIONAL, $definition->getArgument('command')->getDescription(), $name),
                )
            ));
        }

        try {
            $this->runningCommand = null;
            // the command name MUST be the first element of the input
            $command = $this->find($name);
        } catch (\Throwable $e) {
            if (!($e instanceof CommandNotFoundException && !$e instanceof NamespaceNotFoundException) || 1 !== count($alternatives = $e->getAlternatives()) || !$input->isInteractive()) {
                if (null !== $this->dispatcher) {
                    $event = new ConsoleErrorEvent($input, $output, $e);
                    $this->dispatcher->dispatch(ConsoleEvents::ERROR, $event);

                    if (0 === $event->getExitCode()) {
                        return 0;
                    }

                    $e = $event->getError();
                }

                throw $e;
            }

            $alternative = $alternatives[0];

            $style = new SymfonyStyle($input, $output);
            $style->block(sprintf("\nCommand \"%s\" is not defined.\n", $name), null, 'error');
            if (!$style->confirm(sprintf('Do you want to run "%s" instead? ', $alternative), false)) {
                if (null !== $this->dispatcher) {
                    $event = new ConsoleErrorEvent($input, $output, $e);
                    $this->dispatcher->dispatch(ConsoleEvents::ERROR, $event);

                    return $event->getExitCode();
                }

                return 1;
            }

            $command = $this->find($alternative);
        }

        $this->runningCommand = $command;
        $exitCode = $this->doRunCommand($command, $input, $output);
        $this->runningCommand = null;

        return $exitCode;
    }
```

又是一堆准备的方法，核心是最下面的`$this->doRunCommand($command, $input, $output);`这句

然后再继续跟下来...  不想在写了，都是做各种初始化，到最后调用  `command` 的`handle`方法即可，

然后得到的输出又经过一堆的操作显示在控制台里.....