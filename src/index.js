//---------------------------

function ENConversion(pageJson) {
  //Load our Page objects
  this.pages = this.getPagesLog();
  this.previousPage = this.pages[this.pages.length - 1] || new Page({});
  this.currentPage = new Page(pageJson);

  //Stop here if same page as previous page (reload, validation errors etc)
  if (this.currentPage.isSamePageAs(this.previousPage)) {
    return;
  }

  this.updatePagesLog();

  //Stop here if using global override
  if (window.ENConversion_DontConvert) {
    return;
  }

  //Do conversion if using global override
  if (window.ENConversion_Convert) {
    this.convert();
    return;
  }

  this.checkForConversion();
}

ENConversion.prototype.checkForConversion = function () {
  //last page of multiple pages without a redirect
  if (
    this.currentPage.isLastPage() &&
    this.currentPage.hasMoreThanOnePage() &&
    this.currentPage.isSameCampaignAs(this.previousPage) &&
    !this.currentPage.hasRedirect()
  ) {
    this.convert();
  }
  
  //redirected and end of process
  if (
    this.previousPage.hasRedirect() &&
    (this.currentPage.isSinglePage() || this.currentPage.isLastPage() || this.currentPage.isStaticPage())
  ) {
    this.convert();
  }
};

ENConversion.prototype.convert = function () {

    // case for redirection
    const isRedirect =  this.previousPage.hasRedirect() && window.ENConversion_Convert;
    const cPage =  this.currentPage;
    
    // temp set current page as previous for dispatching events
    if (isRedirect) this.currentPage = this.previousPage;
  
    sessionStorage.setItem(
    "ENConversion_Converted_" + this.currentPage.pageJson.campaignId,"true");
    
    this.dispatchEvents();
    
    // reset current page
    if (isRedirect) this.currentPage = cPage;
};

ENConversion.prototype.dispatchEvents = function () {
  var groupEventName;
  switch (this.currentPage.pageJson.pageType) {
    case "donation":
    case "premiumgift":
    case "e-commerce":
      groupEventName = "donation";
      break;
    default:
      groupEventName = "submission";
      break;
  }

  var generalEvent = new Event("synthetic-en:conversion", { bubbles: true });
  var pageEvent = new Event(
    "synthetic-en:conversion:" + this.currentPage.pageJson.pageType,
    { bubbles: true }
  );
  var groupEvent = new Event(
    "synthetic-en:conversion:group:" + groupEventName,
    { bubbles: true }
  );

  dispatchEvent(generalEvent);
  dispatchEvent(pageEvent);
  dispatchEvent(groupEvent);
};

ENConversion.prototype.hasAlreadyConverted = function () {
  //Check if we have session variable for this campaign ID.
  return (
    sessionStorage.getItem(
      "ENConversion_Converted_" + this.currentPage.pageJson.campaignId
    ) !== null
  );
};

ENConversion.prototype.getPagesLog = function () {
  var pagesData = JSON.parse(sessionStorage.getItem("ENConversion_PagesLog"));
  if (pagesData === null) {
    return [];
  }
  return pagesData.map(function (pageData) {
    return new Page(pageData);
  });
};

ENConversion.prototype.updatePagesLog = function () {
  var pages = JSON.parse(sessionStorage.getItem("ENConversion_PagesLog"));
  if (pages === null) {
    sessionStorage.setItem(
      "ENConversion_PagesLog",
      JSON.stringify([this.currentPage.pageJson])
    );
  } else {
    // Don't add to page log if it's the same as previous page (reloads, validation error, etc)
    if (!this.currentPage.isSamePageAs(this.previousPage)) {
      pages.push(this.currentPage.pageJson);
    }
    sessionStorage.setItem("ENConversion_PagesLog", JSON.stringify(pages));
  }
};

//---------------------------

function Page(pageJson) {
  this.pageJson = pageJson;
}

Page.prototype.isLastPage = function () {
  return this.pageJson.pageNumber === this.pageJson.pageCount;
};

Page.prototype.hasMoreThanOnePage = function () {
  return this.pageJson.pageCount > 1;
};

Page.prototype.isSinglePage = function () {
  return this.pageJson.pageCount === 1;
};

Page.prototype.hasRedirect = function () {
  return this.pageJson.redirectPresent;
};

Page.prototype.hasPagesLeft = function () {
  return this.pageJson.pageNumber < this.pageJson.pageCount;
};

Page.prototype.isStaticPage = function () {
  return this.pageJson.pageType === 'staticpage';
}

/**
 * Check if another page is the same page as this page
 * @param {Page|null} page A Page to compare this page to
 * @returns {boolean}
 */
Page.prototype.isSamePageAs = function (page) {
  if (!page) {
    return false;
  }

  return (
    this.pageJson.campaignPageId === page.pageJson.campaignPageId &&
    this.pageJson.pageNumber === page.pageJson.pageNumber
  );
};

/**
 * Check if another page is of the same campaign as this page
 * @param {Page|null} page A Page to compare this page to
 * @returns {boolean}
 */
Page.prototype.isSameCampaignAs = function (page) {
  if (!page) {
    return false;
  }

  return this.pageJson.campaignPageId === page.pageJson.campaignPageId;
};

//---------------------------

if (typeof exports !== "undefined") {
  exports.ENConversion = ENConversion;
  exports.Page = Page;
}
