package com.yroxdev.solealive

import android.appwidget.AppWidgetManager
import android.content.Context
import android.widget.RemoteViews
import es.antonborri.home_widget.HomeWidgetProvider
import es.antonborri.home_widget.HomeWidgetPlugin

class SoleaWidgetProvider : HomeWidgetProvider() {
    override fun onUpdate(context: Context, appWidgetManager: AppWidgetManager, appWidgetIds: IntArray) {
        val data = HomeWidgetPlugin.getData(context)
        for (widgetId in appWidgetIds) {
            val views = RemoteViews(context.packageName, R.layout.solea_widget)
            views.setTextViewText(R.id.solea_stop, data.getString("stop", "Porte Jeune"))
            views.setTextViewText(R.id.solea_departures, data.getString("departures", "Ouvrez Soléa Live pour actualiser"))
            appWidgetManager.updateAppWidget(widgetId, views)
        }
    }
}
