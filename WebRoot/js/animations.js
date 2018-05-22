
(function () {
	var offset = 50;
	function getAnimations(styleSheetName) {
		var anims = [];
		for (i in document.styleSheets) {
			var styleSheet = document.styleSheets[i];
			var filePath = styleSheet.href;
			if (!filePath) continue;
			var filePathSplit = filePath.split("/");
			var fileName = filePathSplit[filePathSplit.length - 1].split(".")[0];
			if (fileName != styleSheetName) continue;
			var rules = styleSheet.rules || styleSheet.cssRules;
			for (rI in rules) {
				var rule = rules[rI];
				if (!rule.selectorText) continue;
				if (!rule.selectorText.includes("_anim")) continue;
				var animStr = rule.selectorText.split(".").pop().split("_anim").shift();
				anims.push(animStr);
			}
		}
		return anims;
	}
	var animations = getAnimations("animations");
	function htmlCollectionToArray(HTMLCollectionObj) {
		return Array.prototype.slice.call(HTMLCollectionObj);
	}
	var animatedElements = [];
	function getAnimatedElements() {
		var animatedElementsList = [];
		animations.forEach(function (anim) {
			var els = document.getElementsByClassName(anim);
			console.log(anim)
			console.log(els)
			console.log(htmlCollectionToArray(els))
			animatedElementsList = animatedElementsList.concat(htmlCollectionToArray(els));
		});
		return animatedElementsList;
	}
	animatedElements = getAnimatedElements();
	function hideElement(el) {
		el.classList.add("is-hidden");
		for (i in animations) {
			var anim = animations[i];
			if (el.classList.contains(anim)) {
				el.classList.remove(anim + "_anim");
				break;
			}
		}
	}
	function showElement(el) {
		for (i in animations) {
			var anim = animations[i];
			if (el.classList.contains(anim)) {
				el.classList.add(anim + "_anim");
				el.classList.remove("is-hidden");
				break;
			}
		}
	}
	function hideElements() {
		animatedElements.forEach(function (el) {
			var bounds = el.getBoundingClientRect();
			if (bounds.top > window.innerHeight || bounds.bottom < 0) {
				hideElement(el);
			}
		});
	}
	hideElements();
	var viewChanged = false;
	window.addEventListener("scroll", function (event) {
		if (!viewChanged) {
			viewChanged = true;
			(!window.requestAnimationFrame) ? setTimeout(updateElements, 250) : window.requestAnimationFrame(updateElements);
		}
	});
	window.addEventListener("resize", function (event) {
		if (!viewChanged) {
			viewChanged = true;
			(!window.requestAnimationFrame) ? setTimeout(updateElements, 250) : window.requestAnimationFrame(updateElements);
		}
	});
	function updateElements() {
		var showedTestBounds = false;
		animatedElements.forEach(function (el) {
			var bounds = el.getBoundingClientRect();
			if (el.classList.contains("is-hidden") && bounds.top <= window.innerHeight - offset && bounds.bottom >= offset) {
				showElement(el);
			} else if (bounds.top > window.innerHeight || bounds.bottom < 0) {
				hideElement(el);
			}
		});
		viewChanged = false;
	};
})();

