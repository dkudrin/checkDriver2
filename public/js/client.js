$(function(){

	$('form').on("submit", function() {
	  var file = this.elements.inffile.files[0];	  
	  if (file) {
	    upload(file);
	  }
	  return false;
	});

	function upload(file) {
	  
	  	var data = new FormData();
	  	data.append("inffile", file);

	  $.ajax({
		type: "POST",
        url: "uploads",
        data: data,        
        processData: false, 
        contentType: false, 
        success: function (data) {
        	$('#log').html(buildView(data));
        	},
        error: function (jqXHR, textStatus, errorThrown) {
        	$('#log').html("Ошибка "+textStatus);        	
        	}		        		        	
		});

	}

	function buildView(data){
		$('#log').html("");
		var DriverObj = JSON.parse(data);
		for (infFileName in DriverObj){
			$('#log').append('<h2>'+infFileName+"</h2>");
			for (Manufacturer in DriverObj[infFileName]){
				$('#log').append('<h3>'+Manufacturer+"</h3>");
				for(Model in DriverObj[infFileName][Manufacturer]){
					$('#log').append('<h4>'+Model+"</h3>");
					DriverObj[infFileName][Manufacturer][Model].forEach(function(os){
						$('#log').append('<p class="os"><strong>'+os+"</strong></p>");
					});


					// for (os in DriverObj[manufacturer][model]){				
					// 	$('#log').append('<p><strong>'+DriverObj[manufacturer][model][os]+"</strong></p>");
					// }
				}
			}
		}		
	}

});


//DriverObj[infFileName][Manufacturer][Model] [OS]
