/*
 * xUnit XML log output JavaScriptMVC plugin
 *
 * The output file can be used for integration with the Jenkins CI server
 * 
 * Version 0.14
 * Copyright (c) 2011 Michael Mayer
 * Dual licensed under the MIT and GPL v2 licenses.
 *
 * Date: Thu Jul  7 15:37:12 CEST 2011
 * 
 * To enable logging, please set FuncUnit.xmlLogFilename to a filename of 
 * your choice in settings.js. You can also define a test case class name
 * prefix in FuncUnit.xmlLogClassPrefix.
 */
 
steal('funcunit/commandline/output/json2.js', function(){
	var classPrefix,
		filename,
		fstream, out;
	
	var writeToLog = function (line, postfix) {
		if(typeof postfix == 'undefined') {
			postfix = "\n";
		}
		
		if(filename) {
			out.write(line + postfix);
		}
	}
	
	var xmlEncode = function (text) {
		text = text.replace(/&/g, '&amp;');
		text = text.replace(/\"/g, '&quot;');
		text = text.replace(/\'/g, '&apos;');
		text = text.replace(/</g, '&lt;');
		text = text.replace(/>/g, '&gt;');
		return text;
	}
	
	var render = function( from, to, data ) {
		var text = readFile(from),
			res = new steal.EJS({
				text: text,
				name: from
			}).render(data),
			file = steal.File(to);
		steal.File(to).save(res);
	}
	
	var globalStartTime = new Date();
	var globalTestCounter = 0;
	var globalErrorCounter = 0;
	var moduleName = '';    
	var moduleStartTime = new Date();
	var moduleLogOutput = '';
	var moduleTestCounter = 0;
	var moduleFailureCounter = 0;
	var moduleErrorCounter = 0;
	var moduleAssertionCounter = 0;

	steal.extend(FuncUnit,{
		begin: function(){
			classPrefix = FuncUnit.xmlLogClassPrefix ? FuncUnit.xmlLogClassPrefix : '';
			filename = FuncUnit.xmlLogFilename ? FuncUnit.xmlLogFilename : false;
			if(filename) {
				fstream = new java.io.FileWriter(filename, false);
				out = new java.io.BufferedWriter(fstream);
				out.write('<?xml version="1.0" encoding="UTF-8"?>' + "\n");
				out.write('<testsuites>' + "\n");
			}
		},
		testStart: function(name){
			print('  ' + name);
			// Prefix class to have a destinct namespace
			moduleLogOutput += '    <testcase class="' + xmlEncode(classPrefix + moduleName) + '" name="' + xmlEncode(name) + '">' + "\n";
			moduleTestCounter++;
			globalTestCounter++;
		},
		log: function(result, message){
			if (!message) {
				message = '';
			}

			// Testdox layout
			print((result ? '    [x] ' : '    [ ] ') + message);

			moduleAssertionCounter++;    		

			if(!result) {
				if(message.substring(0, 12) == 'Died on test') {
					moduleLogOutput += '      <error type="JS">' + xmlEncode(message) + '</error>' + "\n";
					moduleErrorCounter++;
					globalErrorCounter++;
				} else {		        
					moduleLogOutput += '      <failure type="JS">' + xmlEncode(message) + '</failure>' + "\n";
					moduleFailureCounter++;
				}    		    
			}
		},
		testDone: function(name, failures, total){
			moduleLogOutput += '    </testcase>' + "\n";
		},
		moduleStart: function(name){
			moduleName = name;

			print("\n" + name);
		},
		moduleDone: function(name, failures, total){
			var currentDate = new Date();
			var timeDiff = (currentDate.getTime() - moduleStartTime) / 1000;
			
			writeToLog(
				'  <testsuite' +     	        
				' time="' + timeDiff + 
				'" tests="' + moduleTestCounter + 
				'" errors="' + moduleErrorCounter + 
				'" failures="' + moduleFailureCounter + 
				'" assertions="' + moduleAssertionCounter +
				'" name="' + xmlEncode(name) + 
				'">'
			);
			writeToLog(moduleLogOutput, '');
			writeToLog('  </testsuite>');

			// Reset module counters, time and output
			moduleLogOutput = '';
			moduleTestCounter = 0;
			moduleFailureCounter = 0;	
			moduleErrorCounter = 0;        
			moduleAssertionCounter = 0;
			moduleStartTime = new Date();
		},	    
		done: function(failures, total){
			// Summary similar to JUnit/PHPUnit
			var currentDate = new Date();
			var timeDiff = Math.round((currentDate.getTime() - globalStartTime) / 1000);
			var maxMem = (Math.round(java.lang.Runtime.getRuntime().totalMemory() / (1024 * 10.24)) / 100) + ' MB';
			
			print("\n" + 'Time: ' + timeDiff + ' seconds, Memory: ' + maxMem);
			
			if(failures > 0) {
				print("\n" + 'FAILURES!');
				print('Tests: ' + globalTestCounter 
					+ ', Assertions: ' + total 
					+ ', Failures: ' + (failures - globalErrorCounter)
					+ ', Errors: ' + globalErrorCounter);                
			} else {
				print("\n" + 'OK (' + globalTestCounter + ' tests, ' + total + ' assertions)');
			}

			writeToLog('</testsuites>');
			if(filename) {
				out.close();
			}
			
			if (failures > 0 && FuncUnit.failOnError) {
				java.lang.System.exit(1);
			}
		},
		browserStart: function(name){
			print("Starting " + name + "...")
		},
		browserDone: function(name, failures, total){
			print("\n" + name+" done :-)");
		},
		coverage: function(stats){
			print("\n"+'Coverage Statistics:'+"\n")
			print("% Covered\tTotal Lines\tLines Run\tFile Name")
			for(var file in stats.files){
				var fileStats = stats.files[file].stats
				print(fileStats.pct+"\t\t"+fileStats.lines+"\t\t"+fileStats.linesRun+"\t\t"+file)
			}
			var total = stats.total
			print("\n"+'Summary:')
			print(total.pct+"\t\t"+total.lines+"\t\t"+total.linesRun)
			
			
			var fstream = new java.io.FileWriter('funcunit/coverage/coverage.json', false),
				out = new java.io.BufferedWriter(fstream);
			out.write(JSON.stringify(stats));
			out.close();
			this.convertCoverageToCobertura(stats);
		},
		convertCoverageToCobertura: function(stats){
			// eval('stats = '+readFile('funcunit/coverage/coverage.json'))
			steal("steal/generate/ejs.js", 'steal/rhino/file.js', function(){
				render('funcunit/coverage/cobertura.ejs', 'coverage.xml', stats)
			})
		}
	});
})

