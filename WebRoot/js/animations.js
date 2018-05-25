
var offset = 0;
//IE support
if (!String.prototype.includes) {
	String.prototype.includes = function (search, start) {
		'use strict';
		if (typeof start !== 'number') {
			start = 0;
		}

		if (start + search.length > this.length) {
			return false;
		} else {
			return this.indexOf(search, start) !== -1;
		}
	};
}
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
		animatedElementsList = animatedElementsList.concat(htmlCollectionToArray(els));
	});
	return animatedElementsList;
}

function refreshAnimatedElements() {
	animatedElements = [];
	animatedElements = getAnimatedElements();
	for (i in animatedElements) {
		animatedElements[i].parentElement.addEventListener("scroll", function (event) {
			if (!viewChanged) {
				viewChanged = true;
				(!window.requestAnimationFrame) ? setTimeout(updateElements, 250) : window.requestAnimationFrame(updateElements);
			}
		}, { passive: true });
	}

}
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
	var currentParent
	var parentBounds
	animatedElements.forEach(function (el) {
		var bounds = el.getBoundingClientRect();
		if (el.parentElement != currentParent) {
			currentParent = el.parentElement;
			parentBounds = el.parentElement.getBoundingClientRect();
		}
		if (bounds.top > parentBounds.bottom || bounds.bottom < parentBounds.top) {
			hideElement(el);
		}
	});
}
hideElements();
var viewChanged = false;
window.addEventListener("resize", function (event) {
	if (!viewChanged) {
		viewChanged = true;
		(!window.requestAnimationFrame) ? setTimeout(updateElements, 250) : window.requestAnimationFrame(updateElements);
	}
}, { passive: true });

function updateElements() {
	var currentParent
	var parentBounds
	animatedElements.forEach(function (el) {
		try {
			var bounds = el.getBoundingClientRect();
			if (el.parentElement != currentParent) {
				currentParent = el.parentElement;
				parentBounds = el.parentElement.getBoundingClientRect();
			}
			if (el.classList.contains("is-hidden") && bounds.top <= parentBounds.bottom - offset && bounds.bottom >= parentBounds.top + offset) {
				showElement(el);
			} else if (bounds.top > parentBounds.bottom || bounds.bottom < parentBounds.top) {
				hideElement(el);
			}
		} catch (err) {

		}
	});
	viewChanged = false;
};


