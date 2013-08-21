
function ResourceEventRenderer() {
    var t = this;
	
	
    // exports
    t.renderEvents = renderEvents;
    t.compileDaySegs = compileDaySegs; // for DayEventRenderer
    t.clearEvents = clearEvents;
    t.slotSegHtml = slotSegHtml;
    t.bindDaySeg = bindDaySeg;
	
    
    // imports
    DayEventRenderer.call(t);
    var opt = t.opt;
    var trigger = t.trigger;
    //var setOverflowHidden = t.setOverflowHidden;
    var isEventDraggable = t.isEventDraggable;
    var isEventResizable = t.isEventResizable;
    var eventEnd = t.eventEnd;
    var eventElementHandlers = t.eventElementHandlers;
    var setHeight = t.setHeight;
    var getDaySegmentContainer = t.getDaySegmentContainer;
    var getSlotSegmentContainer = t.getSlotSegmentContainer;
    var getHoverListener = t.getHoverListener;
    var getMaxMinute = t.getMaxMinute;
    var getMinMinute = t.getMinMinute;
    var timePosition = t.timePosition;
    var getIsCellAllDay = t.getIsCellAllDay;
    var colContentLeft = t.colContentLeft;
    var colContentRight = t.colContentRight;
    var renderDayEvents = t.renderDayEvents;
    var resizableDayEvent = t.resizableDayEvent; // TODO: streamline binding architecture
    var getColCnt = t.getColCnt;
    var getColWidth = t.getColWidth;
    var getSnapHeight = t.getSnapHeight;
    var getSnapMinutes = t.getSnapMinutes;
    var getBodyContent = t.getBodyContent;    
    var reportEventElement = t.reportEventElement;
    var showEvents = t.showEvents;
    var hideEvents = t.hideEvents;
    var eventDrop = t.eventDrop;
    var eventResize = t.eventResize;
    var renderDayOverlay = t.renderDayOverlay;
    var clearOverlays = t.clearOverlays;
    var calendar = t.calendar;
    var formatDate = calendar.formatDate;
    var formatDates = calendar.formatDates;
    var resources = t.resources;  // imported from ResourceView.js -- odd with getResources
    var getResources = t.getResources; // imported from ResourceView
	
	
	
    /* Rendering
	----------------------------------------------------------------------------*/
	

    function renderEvents(events, modifiedEventId) {
        var i, 
            len=events.length,
            dayEvents=[],
            slotEvents=[];
        
        resources = getResources();
        
        for (i=0; i<len; i++) {
            if (events[i].allDay) {
                dayEvents.push(events[i]);
            }else{
                slotEvents.push(events[i]);
            }
        }
        
        if (opt('allDaySlot')) {
            renderDayEvents(compileDaySegs(dayEvents), modifiedEventId, resources);
            setHeight(); // no params means set to viewHeight
        }
        renderSlotSegs(compileSlotSegs(slotEvents), modifiedEventId);
    }
	
	
    function clearEvents() {
        getDaySegmentContainer().empty();
        getSlotSegmentContainer().empty();
    }
	
    
    function compileDaySegs(events) {
        var levels = stackSegs(sliceSegs(events, $.map(events, exclEndDay), t.visStart, t.visEnd)),
        i, levelCnt=levels.length, level,
        j, seg,
        segs=[];
        for (i=0; i<levelCnt; i++) {
            level = levels[i];
            for (j=0; j<level.length; j++) {
                seg = level[j];
                seg.row = 0;
                seg.level = i; // not needed anymore
                segs.push(seg);
            }
        }
        return segs;
    }
	
    
    function compileSlotSegs(events) {
        var colCnt = getColCnt(),
            minMinute = getMinMinute(),
            maxMinute = getMaxMinute(),
            d = addMinutes(cloneDate(t.visStart), minMinute),
            i, col,
            j, level,
            k, seg,
            segs=[];
            
        for (i=0; i<colCnt; i++) {
            // only events for this resource        
            var resourceEvents = eventsForResource(resources[i], events);
                    
            col = stackSegs(sliceSegs(resourceEvents, $.map(resourceEvents, slotEventEnd), d, addMinutes(cloneDate(d), maxMinute-minMinute)));
            countForwardSegs(col);
            for (j=0; j<col.length; j++) {
                level = col[j];
                for (k=0; k<level.length; k++) {
                    seg = level[k];
                    seg.col = i;
                    seg.level = j;
                    segs.push(seg);
                }
            }
        }
        return segs;
    }
        
        
    function eventsForResource(resource, events) {
        var resourceEvents = [];
		
        for(var i=0; i<events.length; i++) {
            if(events[i].resourceId === resource.id) {
                resourceEvents.push(events[i])
            }
        }
		
        return resourceEvents;
    }
	
	
    function slotEventEnd(event) {
        if (event.end) {
            return cloneDate(event.end);
        }else{
            return addMinutes(cloneDate(event.start), opt('defaultEventMinutes'));
        }
    }
	
    
    // renders events in the 'time slots' at the bottom
	
    function renderSlotSegs(segs, modifiedEventId) {
	
        var i, segCnt=segs.length, seg,
            event,
            classes,
            top, bottom,
            colI, levelI, forward,
            leftmost,
            availWidth,
            outerWidth,
            left,
            html='',
            eventElements,
            eventElement,
            triggerRes,
            titleElement,
            height,
            slotSegmentContainer = getSlotSegmentContainer(),
            rtl, dis;
			
        if (rtl = opt('isRTL')) {
            dis = -1;
        }else{
            dis = 1;
        }
        		
        // calculate position/dimensions, create html
        for (i=0; i<segCnt; i++) {
            seg = segs[i];
            event = seg.event;
            top = timePosition(seg.start, seg.start);
            bottom = timePosition(seg.start, seg.end);
            colI = seg.col;
            levelI = seg.level;
            forward = seg.forward || 0;
            leftmost = colContentLeft(colI);
            availWidth = colContentRight(colI) - leftmost;
            availWidth = Math.min(availWidth-6, availWidth*.95); // TODO: move this to CSS
            if (levelI) {
                // indented and thin
                outerWidth = availWidth / (levelI + forward + 1);
            }else{
                if (forward) {
                    // moderately wide, aligned left still
                    outerWidth = ((availWidth / (forward + 1)) - (12/2)) * 2; // 12 is the predicted width of resizer =
                }else{
                    // can be entire width, aligned left
                    outerWidth = availWidth;
                }
            }
            left = leftmost +                                  // leftmost possible
            (availWidth / (levelI + forward + 1) * levelI) // indentation
            * dis + (rtl ? availWidth - outerWidth : 0);   // rtl
            seg.top = top;
            seg.left = left;
            seg.outerWidth = outerWidth;
            seg.outerHeight = bottom - top;
            html += slotSegHtml(event, seg);
        }
        slotSegmentContainer[0].innerHTML = html; // faster than html()
        eventElements = slotSegmentContainer.children();
		
        // retrieve elements, run through eventRender callback, bind event handlers
        for (i=0; i<segCnt; i++) {
            seg = segs[i];
            event = seg.event;
            eventElement = $(eventElements[i]); // faster than eq()
            triggerRes = trigger('eventRender', event, event, eventElement);
            if (triggerRes === false) {
                eventElement.remove();
            }else{
                if (triggerRes && triggerRes !== true) {
                    eventElement.remove();
                    eventElement = $(triggerRes).css({
                        position: 'absolute',
                        top: seg.top,
                        left: seg.left
                    }).appendTo(slotSegmentContainer);
                }
                seg.element = eventElement;
                if (event._id === modifiedEventId) {
                    bindSlotSeg(event, eventElement, seg);
                }else{
                    eventElement[0]._fci = i; // for lazySegBind
                }
                reportEventElement(event, eventElement);
            }
        }
		
        lazySegBind(slotSegmentContainer, segs, bindSlotSeg);
        
        // record event sides and title positions
        for (i=0; i<segCnt; i++) {
            seg = segs[i];
            if (eventElement = seg.element) {
                seg.vsides = vsides(eventElement, true);
                seg.hsides = hsides(eventElement, true);
                titleElement = eventElement.find('.fc-event-title');
                if (titleElement.length) {
                    seg.contentTop = titleElement[0].offsetTop;
                }
            }
        }
		
        // set all positions/dimensions at once
        for (i=0; i<segCnt; i++) {
            seg = segs[i];
            if (eventElement = seg.element) {
                eventElement[0].style.width = Math.max(0, seg.outerWidth - seg.hsides) + 'px';
                height = Math.max(0, seg.outerHeight - seg.vsides);
                eventElement[0].style.height = height + 'px';
                event = seg.event;
                if (seg.contentTop !== undefined && height - seg.contentTop < 10) {
                    // not enough room for title, put it in the time (TODO: maybe make both display:inline instead)
                    eventElement.find('div.fc-event-time').text(formatDate(event.start, 
                        opt('timeFormat')) + ' - ' + event.title
                    );
                    eventElement.find('div.fc-event-title').remove();
                }
                trigger('eventAfterRender', event, event, eventElement);
            }
        }
					
    }
	
	
    function slotSegHtml(event, seg) {
        var html = "<",
            url = event.url,
            skinCss = getSkinCss(event, opt),
            classes = ['fc-event', 'fc-event-vert'];
        
        if (isEventDraggable(event)) {
            classes.push('fc-event-draggable');
        }
        if (seg.isStart) {
            classes.push('fc-event-start');
        }
        if (seg.isEnd) {
            classes.push('fc-event-end');
        }
        classes = classes.concat(event.className);
        if (event.source) {
            classes = classes.concat(event.source.className || []);
        }
        if (url) {
            html += "a href='" + htmlEscape(event.url) + "'";
        }else{
            html += "div";
        }
        html +=
            " class='" + classes.join(' ') + "'" +
            " style='position:absolute;z-index:8;top:" + seg.top + "px;left:" + seg.left + "px;" + skinCss + "'" +
            ">" +
            "<div class='fc-event-inner'>" +
            "<div class='fc-event-time'>" +
            htmlEscape(formatDates(event.start, event.end, opt('timeFormat'))) +
            "</div>" +
            "<div class='fc-event-title'>" + htmlEscape(event.title || '') + "</div>" +
            "</div>" +
            "<div class='fc-event-bg'></div>";
        if (seg.isEnd && isEventResizable(event)) {
            html += "<div class='ui-resizable-handle ui-resizable-s'>=</div>";
        }
        html += "</" + (url ? "a" : "div") + ">";
        
        return html;
    }
    

    function bindDaySeg(event, eventElement, seg) {
        if (isEventDraggable(event)) {
            draggableDayEvent(event, eventElement, seg.isStart);
        }
        if (seg.isEnd && isEventResizable(event)) {
            resizableDayEvent(event, eventElement, seg);
        }
        eventElementHandlers(event, eventElement);
        // needs to be after, because resizableDayEvent might stopImmediatePropagation on click
    }
	
	
    function bindSlotSeg(event, eventElement, seg) {
        var timeElement = eventElement.find('div.fc-event-time');
        if (isEventDraggable(event)) {
            draggableSlotEvent(event, eventElement, timeElement);
        }
        if (seg.isEnd && isEventResizable(event)) {
            resizableSlotEvent(event, eventElement, timeElement);
        }
        eventElementHandlers(event, eventElement);
    }
	
	
	
    /* Dragging
	-----------------------------------------------------------------------------------*/
	
	
    // when event starts out FULL-DAY
	
    function draggableDayEvent(event, eventElement, isStart) {
        var origWidth,
            revert,
            allDay=true,
            dayDelta,
            dis = opt('isRTL') ? -1 : 1,
            hoverListener = getHoverListener(),
            colWidth = getColWidth(),
            slotHeight = getSnapHeight(),
            minMinute = getMinMinute();
        
        eventElement.draggable({
            opacity: opt('dragOpacity', 'month'), // use whatever the month view was using
            revertDuration: opt('dragRevertDuration'),
            start: function(ev, ui) {
                trigger('eventDragStart', eventElement, event, ev, ui);
                hideEvents(event, eventElement);
                origWidth = eventElement.width();
                hoverListener.start(function(cell, origCell, rowDelta, colDelta) {
                    clearOverlays();
                    if (cell) {
                        //setOverflowHidden(true);
                        revert = false;
                        dayDelta = colDelta * dis;
                        if (!cell.row) {
                            // on full-days
                            renderDayOverlay(
                                addDays(cloneDate(event.start), dayDelta),
                                addDays(exclEndDay(event), dayDelta),
                                true,
                                resources[cell.col]
                            );
                            resetElement();
                        }else{
                            // mouse is over bottom slots
                            if (isStart) {
                                if (allDay) {
                                    // convert event to temporary slot-event
                                    eventElement.width(colWidth - 10); // don't use entire width
                                    setOuterHeight(
                                        eventElement,
                                        slotHeight * Math.round(
                                            (event.end ? ((event.end - event.start) / MINUTE_MS) : opt('defaultEventMinutes'))
                                            / opt('slotMinutes')
                                            )
                                        );
                                    eventElement.draggable('option', 'grid', [colWidth, 1]);
                                    allDay = false;
                                }
                            }else{
                                revert = true;
                            }
                        }
                        revert = revert || (allDay && !dayDelta);
                    }else{
                        resetElement();
                        //setOverflowHidden(false);
                        revert = true;
                    }
                    eventElement.draggable('option', 'revert', revert);
                }, ev, 'drag');
            },
            stop: function(ev, ui) {
                var cell = hoverListener.stop();
                clearOverlays();
                event.resourceId = resources[cell.col].id;
                trigger('eventDragStop', eventElement, event, ev, ui);
                if (revert) {
                    // hasn't moved or is out of bounds (draggable has already reverted)
                    resetElement();
                    eventElement.css('filter', ''); // clear IE opacity side-effects
                    showEvents(event, eventElement);
                }else{
                    // changed!
                    var minuteDelta = 0;
                    if (!allDay) {
                        minuteDelta = Math.round((eventElement.offset().top - getBodyContent().offset().top) / slotHeight)
                        * opt('slotMinutes')
                        + minMinute
                        - (event.start.getHours() * 60 + event.start.getMinutes());
                    }
                    
                    dayDelta = 0;
                    eventDrop(this, event, dayDelta, minuteDelta, allDay, ev, ui);
                }
            //setOverflowHidden(false);
            }
        });
        function resetElement() {
            if (!allDay) {
                eventElement
                .width(origWidth)
                .height('')
                .draggable('option', 'grid', null);
                allDay = true;
            }
        }
    }
	
	
    // when event starts out IN TIMESLOTS
    
    function draggableSlotEvent(event, eventElement, timeElement) {
        var coordinateGrid = t.getCoordinateGrid(),
            colCnt = getColCnt(),
            colWidth = getColWidth(),
            snapHeight = getSnapHeight(),
            snapMinutes = getSnapMinutes();

        // states
        var origPosition, // original position of the element, not the mouse
            origCell,
            isInBounds, prevIsInBounds,
            isAllDay, prevIsAllDay,
            colDelta, prevColDelta,
            dayDelta, // derived from colDelta
            minuteDelta, prevMinuteDelta;

        eventElement.draggable({
            scroll: false,
            grid: [ colWidth, snapHeight ],
            axis: colCnt==1 ? 'y' : false,
            opacity: opt('dragOpacity'),
            revertDuration: opt('dragRevertDuration'),
            start: function(ev, ui) {

                trigger('eventDragStart', eventElement, event, ev, ui);
                hideEvents(event, eventElement);

                coordinateGrid.build();

                // initialize states
                origPosition = eventElement.position();
                origCell = coordinateGrid.cell(ev.pageX, ev.pageY);
                isInBounds = prevIsInBounds = true;
                isAllDay = prevIsAllDay = getIsCellAllDay(origCell);
                colDelta = prevColDelta = 0;
                dayDelta = 0;
                minuteDelta = prevMinuteDelta = 0;

            },
            drag: function(ev, ui) {

                // NOTE: this `cell` value is only useful for determining in-bounds and all-day.
                // Bad for anything else due to the discrepancy between the mouse position and the
                // element position while snapping. (problem revealed in PR #55)
                //
                // PS- the problem exists for draggableDayEvent() when dragging an all-day event to a slot event.
                // We should overhaul the dragging system and stop relying on jQuery UI.
                var cell = coordinateGrid.cell(ev.pageX, ev.pageY);

                // update states
                isInBounds = !!cell;
                if (isInBounds) {
                    isAllDay = getIsCellAllDay(cell);

                    // calculate column delta
                    colDelta = Math.round((ui.position.left - origPosition.left) / colWidth);

                    // calculate minute delta (only if over slots)
                    if (!isAllDay) {
                        minuteDelta = Math.round((ui.position.top - origPosition.top) / snapHeight) * snapMinutes;
                    }
                }

                // any state changes?
                if (
                    isInBounds != prevIsInBounds ||
                    isAllDay != prevIsAllDay ||
                    colDelta != prevColDelta ||
                    minuteDelta != prevMinuteDelta
                    ) {

                    updateUI();

                    // update previous states for next time
                    prevIsInBounds = isInBounds;
                    prevIsAllDay = isAllDay;
                    prevColDelta = colDelta;
                    prevMinuteDelta = minuteDelta;
                }

                // if out-of-bounds, revert when done, and vice versa.
                eventElement.draggable('option', 'revert', !isInBounds);

            },
            stop: function(ev, ui) {

                clearOverlays();
                trigger('eventDragStop', eventElement, event, ev, ui);

                if (isInBounds && (isAllDay || dayDelta || colDelta || minuteDelta)) { // changed!
                    event.oldResourceId = event.resourceId;
                    event.resourceId = resources[origCell.col + colDelta].id;
                    
                    eventDrop(this, event, dayDelta, isAllDay ? 0 : minuteDelta, isAllDay, ev, ui);
                }
                else { // either no change or out-of-bounds (draggable has already reverted)
                    
                    // reset states for next time, and for updateUI()
                    isInBounds = true;
                    isAllDay = false;
                    colDelta = 0;
                    dayDelta = 0;
                    minuteDelta = 0;

                    updateUI();
                    eventElement.css('filter', ''); // clear IE opacity side-effects

                    // sometimes fast drags make event revert to wrong position, so reset.
                    // also, if we dragged the element out of the area because of snapping,
                    // but the *mouse* is still in bounds, we need to reset the position.
                    eventElement.css(origPosition);

                    showEvents(event, eventElement);
                }
            }
        });

        function updateUI() {
            clearOverlays();
            if (isInBounds) {
                if (isAllDay) {
                    timeElement.hide();
                    eventElement.draggable('option', 'grid', null); // disable grid snapping
                    renderDayOverlay(
                        addDays(cloneDate(event.start), dayDelta),
                        addDays(exclEndDay(event), dayDelta),
                        true,
                        resources[origCell.col]
                    );
                }
                else {
                    updateTimeText(minuteDelta);
                    timeElement.css('display', ''); // show() was causing display=inline
                    eventElement.draggable('option', 'grid', [colWidth, snapHeight]); // re-enable grid snapping
                }
            }
        }

        function updateTimeText(minuteDelta) {
            var newStart = addMinutes(cloneDate(event.start), minuteDelta);
            var newEnd;
            if (event.end) {
                newEnd = addMinutes(cloneDate(event.end), minuteDelta);
            }
            timeElement.text(formatDates(newStart, newEnd, opt('timeFormat')));
        }

    }
	
	
    /* Resizing
	--------------------------------------------------------------------------------------*/
    
    function resizableSlotEvent(event, eventElement, timeElement) {
        var snapDelta, prevSnapDelta;
        var snapHeight = getSnapHeight();
        var snapMinutes = getSnapMinutes();
        
        eventElement.resizable({
            handles: {
                s: '.ui-resizable-handle'
            },
            grid: snapHeight,
            start: function(ev, ui) {
                snapDelta = prevSnapDelta = 0;
                hideEvents(event, eventElement);
                trigger('eventResizeStart', this, event, ev, ui);
            },
            resize: function(ev, ui) {
                // don't rely on ui.size.height, doesn't take grid into account
                snapDelta = Math.round((Math.max(snapHeight, eventElement.height()) - ui.originalSize.height) / snapHeight);

                if (snapDelta != prevSnapDelta) {
                    timeElement.text(
                        formatDates(
                            event.start,
                            (!snapDelta && !event.end) ? null : // no change, so don't display time range
                            addMinutes(eventEnd(event), snapMinutes*snapDelta),
                            opt('timeFormat')
                        )
                    );
                    prevSnapDelta = snapDelta;
                }
            },
            stop: function(ev, ui) {
                trigger('eventResizeStop', this, event, ev, ui);
                if (snapDelta) {
                    eventResize(this, event, 0, snapMinutes*snapDelta, ev, ui);
                }else{
                    showEvents(event, eventElement);
                // BUG: if event was really short, need to put title back in span
                }
            }
        });
    }
}


function countForwardSegs(levels) {
    var i, j, k, level, segForward, segBack;
    for (i=levels.length-1; i>0; i--) {
        level = levels[i];
        for (j=0; j<level.length; j++) {
            segForward = level[j];
            for (k=0; k<levels[i-1].length; k++) {
                segBack = levels[i-1][k];
                if (segsCollide(segForward, segBack)) {
                    segBack.forward = Math.max(segBack.forward||0, (segForward.forward||0)+1);
                }
            }
        }
    }
}


