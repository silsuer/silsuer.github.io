function read_files(fileArray){
	for(var i in fileArray){
		var file = fileArray[i]; //这个file对象有以下属性可供读取name、size、lastModifiedDate和type等。
		var reader = new FileReader();
		if(/text\/\w+/.test(file.type)) { //判断文本文件
			reader.onload = function() { //成功读取完毕后触发onload事件
				document.getElementById('inputDemo').innerHTML=this.result;
			}
			reader.readAsText(file);//readAsText函数用于将文件读取为文本
		}else if(/image\/\w+/.test(file.type)) { //判断图片文件
			reader.onload = function() {
				document.getElementById('inputDemo').innerHTML='<img src='+this.result+'>';
			}
			reader.readAsDataURL(file);//readAsDataUrl函数用于将文件读取为Data url
		}
	}
}